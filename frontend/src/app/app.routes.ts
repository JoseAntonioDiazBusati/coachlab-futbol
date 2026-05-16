import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { DashboardPageComponent } from './components/dashboard/dashboard-page.component';
import { PlantillaPageComponent } from './components/plantilla-page/plantilla-page.component';
import { LigaPageComponent } from './components/liga-page/liga-page.component';
import { SetupPageComponent } from './components/setup/setup-page.component';
import { authGuard } from './services/auth.guard';
import { teamGuard } from './services/team.guard';
import { setupGuard } from './services/setup.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'setup', component: SetupPageComponent, canActivate: [authGuard, setupGuard] },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'plantilla', component: PlantillaPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'ligas', component: LigaPageComponent, canActivate: [authGuard, teamGuard] },
  { path: '**', redirectTo: '' },
];
