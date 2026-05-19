import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { EquipoActivoService } from '../../../services/equipo-activo.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly equipoActivo = inject(EquipoActivoService);
  private readonly router = inject(Router);

  navItems = [
    { label: 'Dashboard',  path: '/dashboard' },
    { label: 'Ligas',      path: '/ligas' },
    { label: 'Plantilla',  path: '/plantilla' },
    { label: 'Prepartido', path: '/prepartido' },
  ];

  logout() {
    this.authService.logout();
    this.equipoActivo.limpiar();
    this.router.navigate(['/']);
  }
}
