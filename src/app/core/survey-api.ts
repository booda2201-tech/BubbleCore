import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AuthUser,
  Branch,
  LoginRequest,
  LoginResponse,
  PagedResult,
  PublicSurvey,
  ResponsesQuery,
  SaveSurvey,
  SubmitSurveyResponse,
  SubmitSurveyResult,
  SurveyAnalytics,
  SurveyDetails,
  SurveyListItem,
  SurveyResponseRow,
} from './api-models';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: string[] = [],
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

@Service()
export class SurveyApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl.endsWith('/')
    ? environment.apiBaseUrl
    : `${environment.apiBaseUrl}/`;

  login(body: LoginRequest): Promise<LoginResponse> {
    return this.post<LoginResponse>(this.url('auth', 'login'), body);
  }

  getMe(): Promise<AuthUser> {
    return this.get<AuthUser>(this.url('auth', 'me'));
  }

  getPublicSurvey(slug = environment.surveySlug): Promise<PublicSurvey> {
    return this.get<PublicSurvey>(this.url('public', 'surveys', slug));
  }

  submitPublicResponse(
    body: SubmitSurveyResponse,
    slug = environment.surveySlug,
  ): Promise<SubmitSurveyResult> {
    return this.post<SubmitSurveyResult>(this.url('public', 'surveys', slug, 'responses'), body);
  }

  getBranches(): Promise<Branch[]> {
    return this.get<Branch[]>(this.url('branches'));
  }

  getSurveys(): Promise<SurveyListItem[]> {
    return this.get<SurveyListItem[]>(this.url('surveys'));
  }

  getSurvey(id: number): Promise<SurveyDetails> {
    return this.get<SurveyDetails>(this.url('surveys', id));
  }

  updateSurvey(id: number, body: SaveSurvey): Promise<SurveyDetails> {
    return this.put<SurveyDetails>(this.url('surveys', id), body);
  }

  getAnalytics(id: number): Promise<SurveyAnalytics> {
    return this.get<SurveyAnalytics>(this.url('surveys', id, 'analytics'));
  }

  getResponses(id: number, query: ResponsesQuery = {}): Promise<PagedResult<SurveyResponseRow>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 100));

    const search = query.search?.trim();
    if (search) params = params.set('search', search);
    if (query.stars && query.stars > 0) params = params.set('stars', String(query.stars));

    return this.get<PagedResult<SurveyResponseRow>>(this.url('surveys', id, 'responses'), params);
  }

  deleteResponse(surveyId: number, responseId: number): Promise<void> {
    return this.delete(this.url('surveys', surveyId, 'responses', responseId));
  }

  exportExcel(id: number): Promise<Blob> {
    return this.request(
      firstValueFrom(this.http.get(this.url('surveys', id, 'export'), { responseType: 'blob' })),
    );
  }

  private url(...parts: Array<string | number>): string {
    return this.base + parts.map((part) => encodeURIComponent(String(part))).join('/');
  }

  private get<T>(url: string, params?: HttpParams): Promise<T> {
    return this.request(firstValueFrom(this.http.get<T>(url, { params })));
  }

  private post<T>(url: string, body: unknown): Promise<T> {
    return this.request(firstValueFrom(this.http.post<T>(url, body)));
  }

  private put<T>(url: string, body: unknown): Promise<T> {
    return this.request(firstValueFrom(this.http.put<T>(url, body)));
  }

  private delete(url: string): Promise<void> {
    return this.request(firstValueFrom(this.http.delete(url))).then(() => undefined);
  }

  private async request<T>(promise: Promise<T>): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      throw toApiError(error);
    }
  }
}

function toApiError(error: unknown): ApiRequestError {
  if (error instanceof ApiRequestError) return error;

  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return new ApiRequestError(
        'تعذر الاتصال بالسيرفر. تأكد إن الـ API شغال.',
        0,
      );
    }

    const body = error.error;
    if (body instanceof Blob) {
      return new ApiRequestError(error.statusText || 'حصل خطأ أثناء التحميل.', error.status);
    }

    if (body && typeof body === 'object') {
      const message = typeof body.message === 'string' ? body.message : error.statusText;
      const errors = Array.isArray(body.errors)
        ? body.errors.filter((item: unknown): item is string => typeof item === 'string')
        : [];
      return new ApiRequestError(message || 'حصل خطأ غير متوقع.', error.status, errors);
    }

    return new ApiRequestError(error.message || 'حصل خطأ غير متوقع.', error.status);
  }

  return new ApiRequestError('حصل خطأ غير متوقع.', 0);
}
