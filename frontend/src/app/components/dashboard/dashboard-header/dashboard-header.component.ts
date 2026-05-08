import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  navItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Plantilla', path: '/dashboard' },
    { label: 'Pre-partido', path: '/dashboard' },
    { label: 'Registrar partido', path: '/dashboard' },
  ];

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
