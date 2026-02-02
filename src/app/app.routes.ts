import { Routes } from '@angular/router';
import { EnterLogin } from './features/auth/enter-login/enter-login';
import { Login } from './features/auth/login/login';

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
    loadChildren: () =>
      import('./features/dashboard/dashboard.module')
        .then(m => m.DashboardRoutingModule),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
