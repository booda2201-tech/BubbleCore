import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from '../../core/admin-auth';
import { FeedbackStore } from '../../core/feedback-store';
import { ChoiceOption } from '../../core/models';
import { ApiRequestError, SurveyApi } from '../../core/survey-api';
import { ModernSelectComponent } from '../../shared/modern-select/modern-select';

/** Consecutive logo taps required to reveal the admin gate. */
const SECRET_TAPS = 3;
/** Taps further apart than this restart the sequence. */
const TAP_WINDOW_MS = 900;

@Component({
  selector: 'app-welcome',
  imports: [ReactiveFormsModule, ModernSelectComponent],
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

  private readonly identityField = viewChild<ElementRef<HTMLInputElement>>('identityField');

  private tapCount = 0;
  private lastTap = 0;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{9,15}$/)]],
  });

  protected readonly branchOptions = signal<ChoiceOption[]>([]);
  protected readonly selectedBranch = signal<string | null>(null);

  protected readonly adminGateOpen = signal(false);
  protected readonly adminEmailOrPhone = signal('');
  protected readonly adminPassword = signal('');
  protected readonly adminError = signal('');
  protected readonly adminBusy = signal(false);

  constructor() {
    void this.loadSurvey();
  }

  protected start(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, phone } = this.form.getRawValue();
    const branchId = this.selectedBranch() ? Number(this.selectedBranch()) : null;
    this.store.customer.set({
      name: name.trim(),
      phone: phone.trim(),
      branchId: Number.isFinite(branchId) ? branchId : null,
    });
    this.router.navigate(['/feedback']);
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
      this.router.navigate(['/admin']);
      return;
    }

    this.adminError.set('');
    this.adminEmailOrPhone.set('');
    this.adminPassword.set('');
    this.adminGateOpen.set(true);
    setTimeout(() => this.identityField()?.nativeElement.focus());
  }

  protected closeAdminGate(): void {
    if (this.adminBusy()) return;
    this.adminGateOpen.set(false);
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

      if (!this.auth.hasSurveyAccess()) {
        this.auth.lock();
        this.adminError.set('الحساب ده مش مسموح له يدخل لوحة الفورم دي.');
        return;
      }

      this.adminGateOpen.set(false);
      this.router.navigate(['/admin']);
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

  private async loadSurvey(): Promise<void> {
    try {
      const survey = await this.api.getPublicSurvey();
      this.store.survey.set(survey);
      this.branchOptions.set(
        [...(survey.branches ?? [])]
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
          .map((branch) => ({
            id: String(branch.id),
            label: branch.name,
            icon: '📍',
            tone: 'neutral',
          })),
      );
    } catch {
      this.branchOptions.set([]);
    }
  }
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    return error.errors.length ? error.errors.join(' — ') : error.message;
  }
  return 'حصل خطأ غير متوقع.';
}
