// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { EnterLogin } from './features/auth/enter-login/enter-login';
import { Login } from './features/auth/login/login';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    path: '',
    component: EnterLogin,
  },
  {
    path: 'login',
    component: Login,
  },
 {
  path: 'dashboard',
  canActivate: [authGuard],
  loadChildren: () =>
    import('./features/dashboard/dashboard.module').then(
      (m) => m.DashboardModule   // ✅ بدل DashboardRoutingModule
    ),
},

  {
    path: '**',
    redirectTo: '',
  },
];
