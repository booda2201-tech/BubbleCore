import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DiscountCodeRow } from '../../core/api-models';
import { AdminAuth } from '../../core/admin-auth';
import { discountCodeMobile, discountCodeStatus } from '../../core/discount-code-status';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { SurveyContext } from '../../core/survey-context';

@Component({
  selector: 'app-cashier',
  imports: [DatePipe],
  templateUrl: './cashier.html',
  styleUrl: './cashier.scss',
})
export class CashierComponent {
  private readonly api = inject(SurveyApi);
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);
  private readonly context = inject(SurveyContext);

  protected readonly loading = signal(false);
  protected readonly redeemingId = signal<number | null>(null);
  protected readonly error = signal('');
  protected readonly success = signal('');
  protected readonly query = signal('');
  protected readonly codes = signal<DiscountCodeRow[]>([]);
  protected readonly searched = signal(false);

  protected readonly surveyTitle = computed(
    () => this.auth.surveyAccess()?.title ?? 'التحقق من أكواد الخصم',
  );

  protected readonly staffName = computed(() => this.auth.user()?.name ?? '');

  protected statusOf = discountCodeStatus;
  protected mobileOf = discountCodeMobile;

  protected async search(): Promise<void> {
    const search = this.query().trim();
    if (!search) {
      this.error.set('اكتب كود الخصم أو رقم الموبايل.');
      return;
    }

    const surveyId = this.auth.surveyAccess()?.id;
    if (!surveyId) {
      this.error.set('الحساب ده مش مربوط بالفورم.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    this.searched.set(true);

    try {
      const result = await this.api.searchDiscountCodes(surveyId, {
        search,
        page: 1,
        pageSize: 50,
      });
      this.codes.set(result.items);
    } catch (error) {
      this.codes.set([]);
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  protected onQueryInput(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
    this.error.set('');
    this.success.set('');
  }

  protected onQueryKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.search();
    }
  }

  protected async redeem(code: DiscountCodeRow): Promise<void> {
    const meta = discountCodeStatus(code.status);
    if (!meta.canRedeem || this.redeemingId() !== null) return;

    const surveyId = this.auth.surveyAccess()?.id;
    if (!surveyId) return;

    this.redeemingId.set(code.id);
    this.error.set('');
    this.success.set('');

    try {
      const updated = await this.api.updateDiscountCode(surveyId, code.id, { status: 2 });
      this.codes.update((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));
      this.success.set(`تم تأكيد استخدام الكود ${updated.code}.`);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.redeemingId.set(null);
    }
  }

  protected logout(): void {
    const home = this.context.paths().language;
    this.auth.lock();
    this.router.navigate([home]);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
