// src/app/core/guards/auth-guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  console.log('Guard Check - Token:', token); // أضف هذا السطر لمراقبة الـ Console

  if (token && token !== 'undefined') {
    return true;
  }

  // إذا فشل، وجهه للوجين
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url },
  });
};
