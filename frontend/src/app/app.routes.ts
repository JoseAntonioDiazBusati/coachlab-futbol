import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { DashboardPageComponent } from './components/dashboard/dashboard-page.component';
import { PlantillaPageComponent } from './components/plantilla-page/plantilla-page.component';
import { LigaPageComponent } from './components/liga-page/liga-page.component';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard] },
  { path: 'plantilla', component: PlantillaPageComponent, canActivate: [authGuard] },
  { path: 'ligas', component: LigaPageComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' },
];
