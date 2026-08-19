# BubbleCore

نظام فاخر لجمع تقييمات العملاء مع لوحة تحكم إدارية.
A premium Arabic-first (RTL) customer feedback system with a glassmorphism admin dashboard, built with Angular 22 standalone components, SCSS and Tailwind CSS v4.

## Getting started

```bash
npm install
npm start          # dev server on http://localhost:4200
npm run build      # production bundle in dist/bubble-core
npm test           # unit tests (Vitest)
```

## Routes

| Route       | Screen                   | Notes                                                     |
| ----------- | ------------------------ | --------------------------------------------------------- |
| `/`         | `WelcomeComponent`       | Name + phone capture, hidden admin trigger                |
| `/feedback` | `FeedbackComponent`      | Rating form, guarded by `customerGuard`                    |
| `/admin`    | `AdminDashboardComponent`| KPIs, table, CSV export, guarded by `adminGuard`           |

Unknown routes redirect to `/`. All three screens are lazy-loaded via `loadComponent`.

## Hidden admin access

On the welcome screen, tap the **BubbleCore logo three times in a row** (within ~900 ms between taps) to open the admin password dialog.

- Demo password: `bubble2026` (defined in `src/app/core/admin-auth.ts`)
- The unlocked state lives in `sessionStorage`, and `adminGuard` blocks `/admin` until unlocked.
- This is a client-side gate for demo purposes only — move the check to a backend before shipping.

## Architecture

```
src/
  tailwind.css                  Tailwind v4 entry + @theme design tokens
  styles.scss                   Dark theme, RTL base, glassmorphism component classes
  index.html                    lang="ar" dir="rtl" + Tajawal/Marhey fonts
  app/
    app.routes.ts               Lazy routes + guards
    core/
      models.ts                 FeedbackEntry, rating categories, chip definitions
      feedback-store.ts         Signal store, KPIs, localStorage persistence, CSV
      admin-auth.ts             Password gate + session state
      admin-guard.ts            Protects /admin
      customer-guard.ts         Protects /feedback
    shared/star-rating/         Reusable star rating (two-way `[(value)]`, keyboard support)
    features/
      welcome/                  WelcomeComponent
      feedback/                 FeedbackComponent
      admin-dashboard/          AdminDashboardComponent
```

State is held in signals inside `FeedbackStore`; submitted reviews persist to `localStorage`
under the `bubblecore.feedback.v1` key, so the dashboard survives a page reload.
When the table is empty you can load sample rows with **تحميل بيانات تجريبية**.

## Styling system

Tailwind v4 is wired through PostCSS (`.postcssrc.json` → `@tailwindcss/postcss`).
`src/tailwind.css` holds the `@import "tailwindcss"` and the `@theme` tokens
(kept as plain CSS because Sass cannot resolve the package import), while
`src/styles.scss` layers the app theme on top.

Design tokens: `ink-*` (dark canvas), `gold-*` (champagne accent), `royal-*`,
fonts `font-sans` (Tajawal) and `font-display` (Marhey), animations
`animate-float`, `animate-rise`, `animate-shimmer`.

Reusable classes from `styles.scss`:

| Class                                     | Purpose                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `.glass` / `.glass-strong` / `.glass-soft`| Semi-transparent surface + `backdrop-filter` blur     |
| `.glass-card` / `.glass-panel`            | Rounded glass containers with a hairline top highlight |
| `.glass-hover`                            | Lift + gold border on hover                           |
| `.glass-input` / `.field-label` / `.field-error` | Form controls                                  |
| `.btn` / `.btn-gold` / `.btn-ghost`       | Buttons                                               |
| `.pill` / `.pill-active`                  | Chip selection                                        |
| `.text-gold-gradient` / `.eyebrow` / `.hairline` | Typography accents                             |
| `.orb`                                    | Ambient blurred background orb                        |
| `.ltr-nums`                               | Keeps phone numbers and digits left-to-right in RTL    |

`prefers-reduced-motion` is respected globally.

## RTL

The document is `dir="rtl"` with `lang="ar"`. Layout uses logical properties
(`start`/`end`, `inset-inline`, `margin-inline`) so the UI mirrors correctly, and
the star rating maps arrow keys according to the document direction.
