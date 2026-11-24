import { Routes } from '@angular/router';
import { adminGuard } from './core/admin-guard';
import { cashierGuard } from './core/cashier-guard';
import { channelGuard } from './core/channel-guard';
import { customerGuard } from './core/customer-guard';
import { discountGuard } from './core/discount-guard';

const publicFlowChildren: Routes = [
  {
    path: 'welcome',
    title: 'BubbleCore — Start feedback',
    loadComponent: () => import('./features/welcome/welcome').then((m) => m.WelcomeComponent),
  },
  {
    path: 'feedback',
    title: 'BubbleCore — Feedback',
    canActivate: [customerGuard],
    loadComponent: () => import('./features/feedback/feedback').then((m) => m.FeedbackComponent),
  },
  {
    path: 'discount-code',
    title: 'BubbleCore — Discount code',
    canActivate: [discountGuard],
    loadComponent: () =>
      import('./features/discount-code/discount-code').then((m) => m.DiscountCodeComponent),
  },
  {
    path: 'claim-discount',
    title: 'BubbleCore — Claim discount',
    loadComponent: () =>
      import('./features/claim-discount/claim-discount').then((m) => m.ClaimDiscountComponent),
  },
];

export const routes: Routes = [
  {
    path: '',
    canActivate: [channelGuard('store')],
    children: [
      {
        path: '',
        title: 'BubbleCore — Choose language',
        loadComponent: () =>
          import('./features/language-select/language-select').then((m) => m.LanguageSelectComponent),
      },
      ...publicFlowChildren,
    ],
  },
  {
    path: 'expo',
    canActivate: [channelGuard('expo')],
    children: [
      {
        path: '',
        title: 'Bubble Hope Expo — Choose language',
        loadComponent: () =>
          import('./features/language-select/language-select').then((m) => m.LanguageSelectComponent),
      },
      ...publicFlowChildren.map((route) => ({
        ...route,
        title:
          typeof route.title === 'string'
            ? route.title.replace('BubbleCore', 'Bubble Hope Expo')
            : route.title,
      })),
    ],
  },
  {
    path: 'admin',
    title: 'BubbleCore — Admin',
    canActivate: [channelGuard('store'), adminGuard],
    loadComponent: () =>
      import('./features/admin-dashboard/admin-dashboard').then((m) => m.AdminDashboardComponent),
  },
  {
    path: 'cashier',
    title: 'BubbleCore — Cashier',
    canActivate: [channelGuard('store'), cashierGuard],
    loadComponent: () => import('./features/cashier/cashier').then((m) => m.CashierComponent),
  },
  { path: '**', redirectTo: '' },
];
