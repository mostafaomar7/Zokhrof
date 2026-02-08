import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AfterPassKey } from './pages/after-pass-key/after-pass-key';
import { ProjectData } from './pages/project-data/project-data';
import { authGuard } from '../../core/guards/auth-guard'; // عدّل المسار حسب مكان الملف
import { AfterPassKeyManagement } from './pages/after-pass-key-management/after-pass-key-management';

const routes: Routes = [
  {
     path: '',
    canActivate: [authGuard], // اختياري
    children: [
      { path: '', pathMatch: 'full', component: Home },
      { path: 'pass-key', component: AfterPassKey },
      { path: 'project-data', component: ProjectData },
      { path: 'management-pass-key', component: AfterPassKeyManagement },
      { path: '**', redirectTo: '' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
