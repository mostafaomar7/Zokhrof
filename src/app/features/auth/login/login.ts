// src/app/features/auth/login/login.ts
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import {  NgZone } from '@angular/core'; // 1. أضف NgZone
@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  standalone: true,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
private ngZone = inject(NgZone);
  showPassword = false;
  isLoading = false;
  serverMessage = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(64),
        // حرف صغير + كبير + رقم + رمز + 8+
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/),
      ],
    ],
  });

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  submit() {
    this.serverMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (res) => {
  this.isLoading = false;
  if (res?.success && res?.data?.token) {
    this.auth.setToken(res.data.token);
    
    // 3. استخدم ngZone لضمان الانتقال
    this.ngZone.run(() => {
      this.router.navigate(['/dashboard']); // تأكد من اسم المسار الصحيح
    });
    return;
  }
  this.serverMessage = res?.message || 'فشل تسجيل الدخول.';
},

      error: (err: HttpErrorResponse) => {
        this.isLoading = false;

        // امسح أخطاء السيرفر القديمة (لو موجودة)
        if (this.email.errors?.['server']) {
          const { server, ...rest } = this.email.errors as any;
          this.email.setErrors(Object.keys(rest).length ? rest : null);
        }
        if (this.password.errors?.['server']) {
          const { server, ...rest } = this.password.errors as any;
          this.password.setErrors(Object.keys(rest).length ? rest : null);
        }

        // 422 validation errors
        if (err.status === 422 && err.error?.errors) {
          const errors = err.error.errors;

          if (errors.email?.length) {
            this.email.setErrors({ ...(this.email.errors || {}), server: errors.email[0] });
          }
          if (errors.password?.length) {
            this.password.setErrors({ ...(this.password.errors || {}), server: errors.password[0] });
          }

          this.serverMessage = err.error?.message || 'بيانات غير صحيحة.';
          return;
        }

        // 401 invalid credentials
        if (err.status === 401) {
          this.password.setErrors({ ...(this.password.errors || {}), invalid: true });
          this.serverMessage = err.error?.message || 'البريد أو كلمة المرور غير صحيحة.';
          return;
        }

        // أي خطأ تاني
        this.serverMessage = err.error?.message || 'حدث خطأ. حاول مرة أخرى.';
      },
    });
  }
}
