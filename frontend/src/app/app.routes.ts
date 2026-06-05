import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { DashboardPageComponent } from './components/dashboard/dashboard-page.component';
import { PlantillaPageComponent } from './components/plantilla-page/plantilla-page.component';
import { LigaPageComponent } from './components/liga-page/liga-page.component';
import { PrepartidoPageComponent } from './components/prepartido-page/prepartido-page.component';
import { RegistrarPartidoPageComponent } from './components/registrar-partido-page/registrar-partido-page.component';
import { authGuard } from './services/auth.guard';
import { teamGuard } from './services/team.guard';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: DashboardPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'plantilla', component: PlantillaPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'ligas', component: LigaPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'prepartido', component: PrepartidoPageComponent, canActivate: [authGuard, teamGuard] },
  { path: 'partidos', component: RegistrarPartidoPageComponent, canActivate: [authGuard, teamGuard] },
  { path: '**', redirectTo: '' },
];
