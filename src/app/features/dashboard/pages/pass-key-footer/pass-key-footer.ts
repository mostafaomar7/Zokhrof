import { KeysService , KeyType } from './../../../../core/services/keys';
// src/app/shared/pass-key-footer/pass-key-footer.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-pass-key-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pass-key-footer.html',
  styleUrl: './pass-key-footer.css',
})
export class PassKeyFooterComponent {
  private keysApi = inject(KeysService);
  private router = inject(Router);

  /** مثال: 'general_admin' */
  @Input({ required: true }) keyType!: KeyType;

  /** مثال: '/dashboard/management-pass-key' */
  @Input({ required: true }) redirectTo!: string;

  /** عدد الخانات */
  @Input() digits = 4;

  isLoading = false;
  errorMessage = '';

  get passKeys() {
    return Array.from({ length: this.digits });
  }

  private codeDigits: string[] = [];

  // انتقال تلقائي بين الخانات
  onKeyInput(event: Event, index: number) {
    this.errorMessage = '';
    const input = event.target as HTMLInputElement;

    // رقم واحد فقط
    const value = (input.value || '').replace(/[^0-9]/g, '').slice(0, 1);
    input.value = value;

    this.codeDigits[index] = value;

    if (value && input.nextElementSibling instanceof HTMLInputElement) {
      input.nextElementSibling.focus();
    }
  }

  // Backspace يرجّع للخانة اللي قبلها
  onKeyDown(event: KeyboardEvent) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value) {
      const prev = input.previousElementSibling as HTMLInputElement | null;
      prev?.focus();
    }
  }

  // تجميع الكود النهائي
  private buildCode(): string {
    const code = (this.codeDigits || []).join('').trim();
    return code;
  }

  submit() {
    this.errorMessage = '';

    const code = this.buildCode();

    // فاليديشن بسيطة
    if (!code || code.length !== this.digits) {
      this.errorMessage = `من فضلك أدخل ${this.digits} أرقام.`;
      return;
    }

    this.isLoading = true;

    this.keysApi.verify({ key_type: this.keyType, code }).subscribe({
      next: (res) => {
        this.isLoading = false;

        if (res?.success) {
          this.router.navigateByUrl(this.redirectTo);
          return;
        }

        this.errorMessage = res?.message || 'الكود غير صحيح.';
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading = false;

        // غالباً السيرفر هيرجع 401/422 أو message
        this.errorMessage =
          err?.error?.message ||
          (err.status === 0 ? 'تعذر الاتصال بالسيرفر.' : 'الكود غير صحيح.');
      },
    });
  }

  clearInputs(container: HTMLElement) {
    this.errorMessage = '';
    this.codeDigits = [];
    const inputs = Array.from(container.querySelectorAll('input.key-input')) as HTMLInputElement[];
    inputs.forEach((i) => (i.value = ''));
    inputs[0]?.focus();
  }
}
