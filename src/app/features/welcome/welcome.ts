import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminAuth } from '../../core/admin-auth';
import { FeedbackStore } from '../../core/feedback-store';

/** Consecutive logo taps required to reveal the admin gate. */
const SECRET_TAPS = 3;
/** Taps further apart than this restart the sequence. */
const TAP_WINDOW_MS = 900;

@Component({
  selector: 'app-welcome',
  imports: [ReactiveFormsModule],
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

  private readonly passwordField = viewChild<ElementRef<HTMLInputElement>>('passwordField');

  private tapCount = 0;
  private lastTap = 0;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\s-]{9,15}$/)]],
  });

  protected readonly adminGateOpen = signal(false);
  protected readonly adminPassword = signal('');
  protected readonly adminError = signal('');

  protected start(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, phone } = this.form.getRawValue();
    this.store.customer.set({ name: name.trim(), phone: phone.trim() });
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
    this.adminError.set('');
    this.adminPassword.set('');
    this.adminGateOpen.set(true);
    setTimeout(() => this.passwordField()?.nativeElement.focus());
  }

  protected closeAdminGate(): void {
    this.adminGateOpen.set(false);
  }

  protected submitAdminPassword(): void {
    if (this.auth.unlock(this.adminPassword())) {
      this.adminGateOpen.set(false);
      this.router.navigate(['/admin']);
      return;
    }
    this.adminError.set('كلمة المرور غير صحيحة');
    this.adminPassword.set('');
  }

  protected invalid(control: 'name' | 'phone'): boolean {
    const field = this.form.controls[control];
    return field.invalid && (field.touched || field.dirty);
  }
}
