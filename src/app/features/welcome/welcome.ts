import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AdminAuth } from '../../core/admin-auth';
import { DiscountCheck, IssueDiscountResult } from '../../core/api-models';
import { DiscountClient } from '../../core/discount-client';
import { FeedbackStore } from '../../core/feedback-store';
import { I18n } from '../../core/i18n';
import { ChoiceOption } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { SurveyContext } from '../../core/survey-context';
import { ModernSelectComponent } from '../../shared/modern-select/modern-select';

/** Consecutive logo taps required to reveal the admin gate. */
const SECRET_TAPS = 3;
/** Taps further apart than this restart the sequence. */
const TAP_WINDOW_MS = 900;

@Component({
  selector: 'app-welcome',
  imports: [ReactiveFormsModule, ModernSelectComponent, RouterLink],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  host: {
    '(document:keydown.escape)': 'closeAdminGate()',
  },
})
export class WelcomeComponent {
  private readonly router = inject(Router);
  private readonly store = inject(FeedbackStore);
  private readonly auth = inject(AdminAuth);
  private readonly api = inject(SurveyApi);
  private readonly discount = inject(DiscountClient);
  private readonly context = inject(SurveyContext);
  protected readonly i18n = inject(I18n);
  protected readonly isExpo = this.context.isExpo;
  protected readonly paths = this.context.paths;

  private readonly identityField = viewChild<ElementRef<HTMLInputElement>>('identityField');

  private tapCount = 0;
  private lastTap = 0;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{9,15}$/)]],
  });

  protected readonly branchOptions = computed<ChoiceOption[]>(() =>
    [...(this.store.survey()?.branches ?? [])]
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .map((branch) => ({
        id: String(branch.id),
        label: this.i18n.pick(branch.name, branch.nameEn),
        icon: '📍',
        tone: 'neutral',
      })),
  );
  protected readonly selectedBranch = signal<string | null>(null);
  protected readonly branchTouched = signal(false);

  protected readonly startBusy = signal(false);
  protected readonly startError = signal('');
  protected readonly issuedDiscount = this.store.discount;

  protected readonly adminGateOpen = signal(false);
  protected readonly adminEmailOrPhone = signal('');
  protected readonly adminPassword = signal('');
  protected readonly showAdminPassword = signal(false);
  protected readonly adminError = signal('');
  protected readonly adminBusy = signal(false);

  protected readonly discountCheck = signal<DiscountCheck | null>(null);
  protected readonly discountEnabled = computed(
    () => this.store.survey()?.discount?.enabled === true,
  );
  protected readonly discountHint = computed(() => discountHintMessage(this.discountCheck()));
  protected readonly showBranch = computed(
    () => !this.isExpo() && this.branchOptions().length > 0,
  );
  protected readonly branchMissing = computed(
    () =>
      this.showBranch() && this.branchTouched() && this.branchOptions().length > 0 && !this.selectedBranch(),
  );

  constructor() {
    void this.loadSurvey();
    void this.discount.ensureSession();
  }

  protected async start(): Promise<void> {
    this.branchTouched.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.showBranch() && !this.selectedBranch()) return;

    const { name, phone } = this.form.getRawValue();
    // Expo hides the branch picker, but the API still requires a branchId —
    // use the sole exhibition branch when the UI is suppressed.
    const branchId = this.resolveBranchId();

    this.startBusy.set(true);
    this.startError.set('');
    this.store.discount.set(null);

    try {
      if (this.discountEnabled()) {
        const existing = await this.api.checkDiscount(phone.trim());
        this.discountCheck.set(existing);

        if (existing.hasCode && existing.code) {
          this.store.discount.set(toIssued(existing));
          this.startError.set('التقييم والكود مرتبطين بالرقم ده بالفعل.');
          return;
        }
      }
    } catch {
      // If the discount API is unavailable, still allow the evaluation.
    } finally {
      this.startBusy.set(false);
    }

    if (this.startError()) return;

    this.store.customer.set({
      name: name.trim(),
      phone: phone.trim(),
      branchId: Number.isFinite(branchId) ? branchId : null,
    });
    this.router.navigate([this.paths().feedback]);
  }

  protected openExistingCode(): void {
    if (!this.store.discount()?.code) return;
    this.router.navigate([this.paths().discountCode]);
  }

  /** Hidden entry point: three quick taps on the logo open the admin gate. */
  protected onLogoTap(): void {
    const now = Date.now();
    this.tapCount = now - this.lastTap > TAP_WINDOW_MS ? 1 : this.tapCount + 1;
    this.lastTap = now;

    if (this.tapCount >= SECRET_TAPS) {
      this.tapCount = 0;
      this.openAdminGate();
    }
  }

  protected openAdminGate(): void {
    if (this.auth.isUnlocked()) {
      this.router.navigate([this.auth.homeRoute()]);
      return;
    }

    this.adminError.set('');
    this.adminEmailOrPhone.set('');
    this.adminPassword.set('');
    this.showAdminPassword.set(false);
    this.adminGateOpen.set(true);
    setTimeout(() => this.identityField()?.nativeElement.focus());
  }

  protected closeAdminGate(): void {
    if (this.adminBusy()) return;
    this.adminGateOpen.set(false);
    this.showAdminPassword.set(false);
  }

  protected toggleAdminPassword(): void {
    this.showAdminPassword.update((value) => !value);
  }

  protected async submitAdminLogin(): Promise<void> {
    if (this.adminBusy()) return;

    const emailOrPhone = this.adminEmailOrPhone().trim();
    const password = this.adminPassword();
    if (!emailOrPhone || !password) {
      this.adminError.set('الإيميل/الموبايل والباسورد مطلوبين.');
      return;
    }

    this.adminBusy.set(true);
    this.adminError.set('');

    try {
      const session = await this.api.login({ emailOrPhone, password });
      this.auth.setSession(session);

      // Staff always land on the survey of the page they logged in from.
      // Expo is strict (never fall back to the store admin); the store page may
      // fall back to the account's only staff survey.
      const preferredSlug = this.context.slug();
      let pinned = this.auth.useSurvey(preferredSlug);

      if (!pinned && this.context.isExpo()) {
        this.auth.lock();
        this.adminError.set('الحساب ده مش مسموح له يدخل أدمن المعرض.');
        return;
      }

      if (!pinned) {
        const fallback = this.auth.surveyAccess();
        pinned = !!fallback && this.auth.useSurvey(fallback.slug);
      }

      if (!pinned) {
        this.auth.lock();
        this.adminError.set('الحساب ده مش مسموح له يدخل لوحة الفورم دي.');
        return;
      }

      const route = this.auth.homeRoute();
      if (route === '/') {
        this.auth.lock();
        this.adminError.set('الحساب ده مش مربوط بدور مسموح (Admin أو Cashier).');
        return;
      }

      this.adminGateOpen.set(false);
      this.router.navigate([route]);
    } catch (error) {
      this.adminError.set(loginErrorMessage(error));
      this.adminPassword.set('');
    } finally {
      this.adminBusy.set(false);
    }
  }

  protected invalid(control: 'name' | 'phone'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }

  protected onPhoneInput(): void {
    this.scheduleDiscountCheck();
  }

  protected onPhoneBlur(): void {
    this.scheduleDiscountCheck(0);
  }

  protected onBranchChange(value: string | null): void {
    this.selectedBranch.set(value);
    this.branchTouched.set(true);
  }

  private async loadSurvey(): Promise<void> {
    try {
      const survey = await this.api.getPublicSurvey();
      this.store.survey.set(survey);
    } catch {
      this.store.survey.set(null);
    }
  }

  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCheckedPhone = '';

  private scheduleDiscountCheck(delayMs = 450): void {
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }

    const phone = this.form.controls.phone.value.trim();
    if (this.form.controls.phone.invalid || !phone) {
      this.discountCheck.set(null);
      this.lastCheckedPhone = '';
      return;
    }

    if (this.store.survey() && this.store.survey()?.discount?.enabled !== true) {
      this.discountCheck.set(null);
      return;
    }

    this.checkTimer = setTimeout(() => {
      this.checkTimer = null;
      void this.runDiscountCheck(phone);
    }, delayMs);
  }

  private async runDiscountCheck(phone: string): Promise<void> {
    if (phone === this.lastCheckedPhone) return;
    this.lastCheckedPhone = phone;

    try {
      this.discountCheck.set(await this.api.checkDiscount(phone));
    } catch {
      this.discountCheck.set(null);
      this.lastCheckedPhone = '';
    }
  }

  private resolveBranchId(): number | null {
    if (this.showBranch()) {
      const selected = Number(this.selectedBranch());
      return Number.isFinite(selected) ? selected : null;
    }

    const fromOptions = Number(this.branchOptions()[0]?.id);
    if (Number.isFinite(fromOptions)) return fromOptions;

    const fromSurvey = this.store.survey()?.branches?.[0]?.id;
    return typeof fromSurvey === 'number' ? fromSurvey : null;
  }
}

function toIssued(check: DiscountCheck): IssueDiscountResult {
  return {
    hasActiveCode: check.hasCode,
    code: check.code,
    discountPercent: check.discountPercent,
    expiresAt: check.expiresAt,
    status: check.status,
    alreadyIssued: check.hasCode,
    message: check.message,
  };
}

function discountHintMessage(check: DiscountCheck | null): string {
  if (!check) return '';
  if (check.hasCode) {
    return 'الرقم ده عنده كود خصم فعّال. اطلبه من شاشة المطالبة أو من الزر اللي تحت.';
  }
  if (check.usedBefore) {
    return 'الرقم ده استخدم كود الخصم قبل كده. تقدر تقيّم عادي.';
  }
  if (check.expiredBefore) {
    return 'كود الخصم السابق على الرقم ده انتهى. تقدر تقيّم عادي.';
  }
  return check.message?.trim() ?? '';
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
