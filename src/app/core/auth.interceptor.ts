import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AdminAuth } from './admin-auth';
import { SurveyContext } from './survey-context';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuth);
  const router = inject(Router);
  const context = inject(SurveyContext);

  const token = auth.token();
  const skipAuth = shouldSkipAuth(req.url);

  const authedReq =
    token && !skipAuth
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !skipAuth) {
        const home = context.paths().language;
        auth.lock();
        void router.navigate([home]);
      }
      return throwError(() => error);
    }),
  );
};

function shouldSkipAuth(url: string): boolean {
  return (
    url.includes('/public/') || url.includes('/auth/login') || url.includes('/auth/register')
  );
}
