import { Routes } from '@angular/router';
import { adminGuard } from './core/admin-guard';
import { cashierGuard } from './core/cashier-guard';
import { customerGuard } from './core/customer-guard';

export const routes: Routes = [
  {
    path: '',
    title: 'BubbleCore — ابدأ التقييم',
    loadComponent: () => import('./features/welcome/welcome').then((m) => m.WelcomeComponent),
  },
  {
    path: 'feedback',
    title: 'BubbleCore — تقييم التجربة',
    canActivate: [customerGuard],
    loadComponent: () => import('./features/feedback/feedback').then((m) => m.FeedbackComponent),
  },
  {
    path: 'admin',
    title: 'BubbleCore — لوحة التحكم',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'cashier',
    title: 'BubbleCore — التحقق من الخصم',
    canActivate: [cashierGuard],
    loadComponent: () => import('./features/cashier/cashier').then((m) => m.CashierComponent),
  },
  { path: '**', redirectTo: '' },
];
