import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { AfterPassKey } from './pages/after-pass-key/after-pass-key';
import { ProjectData } from './pages/project-data/project-data';

const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', pathMatch: 'full', component: Home },
      { path: 'pass-key', component: AfterPassKey },
      { path: 'project-data', component: ProjectData },
      { path: '**', redirectTo: '' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
