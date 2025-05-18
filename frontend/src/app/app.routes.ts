import { Routes } from '@angular/router';
import { LoginComponent } from './login.component';
import { RegisterComponent } from './register.component';
import { DashboardComponent } from './dashboard.component';
import { ErrorComponent } from './error.component';
import { AuthGuard } from './auth.guard';
import { ProjekteComponent } from './projekte.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'projekte', component: ProjekteComponent, canActivate: [AuthGuard] },
  {
    path: 'kunden',
    loadComponent: () => import('./kunden.component').then(m => m.KundenComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'rechnungen',
    loadComponent: () => import('./rechnungen.component').then(m => m.RechnungenComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'firmenintern',
    loadComponent: () => import('./company.component').then(m => m.CompanyComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'angebote',
    loadComponent: () => import('./angebote.component').then(m => m.AngeboteComponent),
    canActivate: [AuthGuard]
  },
  { path: 'error', component: ErrorComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
