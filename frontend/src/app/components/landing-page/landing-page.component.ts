import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPanelComponent, AuthMode } from '../auth/auth-panel/auth-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { HeroComponent } from '../hero/hero.component';
import { FeaturesComponent } from '../features/features.component';
import { CtaBannerComponent } from '../cta-banner/cta-banner.component';
import { FooterComponent } from '../footer/footer.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService } from '../../services/equipo.service';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    CtaBannerComponent,
    FooterComponent,
    AuthPanelComponent,
  ],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent {
  private readonly router = inject(Router);
  private readonly equipoActivo = inject(EquipoActivoService);
  private readonly equipoService = inject(EquipoService);

  authOpen = false;
  authMode: AuthMode = 'login';

  openLogin() {
    this.authMode = 'login';
    this.authOpen = true;
  }

  openRegister() {
    this.authMode = 'register';
    this.authOpen = true;
  }

  closeAuth() {
    this.authOpen = false;
  }

  onAuthenticated() {
    this.authOpen = false;

    // Si ya hay un equipo activo en esta sesión, vamos directos al dashboard.
    if (this.equipoActivo.tieneEquipo()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // El usuario puede tener equipos en el backend aunque sea un navegador nuevo
    // (localStorage vacío). Consultamos antes de obligar a crear un equipo.
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        if (equipos.length > 0) {
          this.equipoActivo.setEquipo(equipos[0].id);
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/ligas']);
        }
      },
      error: () => this.router.navigate(['/ligas']),
    });
  }
}
