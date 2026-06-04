import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { EquipoActivoService } from '../../../services/equipo-activo.service';
import { PerfilService, Perfil } from '../../../services/perfil.service';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, AsyncPipe, FormsModule],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  readonly authService = inject(AuthService);
  private readonly equipoActivo = inject(EquipoActivoService);
  private readonly router = inject(Router);
  private readonly perfilService = inject(PerfilService);

  navItems = [
    { label: 'Dashboard',  path: '/dashboard' },
    { label: 'Ligas',      path: '/ligas' },
    { label: 'Plantilla',  path: '/plantilla' },
    { label: 'Prepartido', path: '/prepartido' },
    { label: 'Partidos',   path: '/partidos' },
  ];

  // ── Modal de perfil ────────────────────────────
  modalAbierto = false;
  perfil: Perfil | null = null;
  cargando = false;
  error: string | null = null;

  datos = { nombre: '', email: '' };
  guardandoDatos = false;
  exitoDatos: string | null = null;
  errorDatos: string | null = null;

  pass = { actual: '', nueva: '', confirmacion: '' };
  guardandoPass = false;
  exitoPass: string | null = null;
  errorPass: string | null = null;

  mostrarEliminar = false;
  passwordEliminar = '';
  eliminando = false;
  errorEliminar: string | null = null;

  abrirPerfil(): void {
    this.modalAbierto = true;
    this.exitoDatos = null;
    this.errorDatos = null;
    this.exitoPass = null;
    this.errorPass = null;
    if (!this.perfil) this.cargarPerfil();
  }

  cerrarPerfil(): void {
    this.modalAbierto = false;
    this.mostrarEliminar = false;
  }

  cargarPerfil(): void {
    this.cargando = true;
    this.error = null;
    this.perfilService.obtener().subscribe({
      next: (p) => {
        this.perfil = p;
        this.datos = { nombre: p.nombre, email: p.email };
        this.cargando = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar el perfil.';
        this.cargando = false;
      },
    });
  }

  get datosValidos(): boolean {
    return !!this.datos.nombre.trim() && /\S+@\S+\.\S+/.test(this.datos.email);
  }

  guardarDatos(): void {
    if (!this.datosValidos || !this.perfil) return;
    const emailCambia = this.datos.email.trim().toLowerCase() !== this.perfil.email.toLowerCase();
    this.guardandoDatos = true;
    this.exitoDatos = null;
    this.errorDatos = null;
    this.perfilService
      .actualizar({ nombre: this.datos.nombre.trim(), email: this.datos.email.trim() })
      .subscribe({
        next: (p) => {
          this.perfil = p;
          this.authService.setCurrentUser({ email: p.email, nombre: p.nombre });
          this.guardandoDatos = false;
          if (emailCambia) {
            this.cerrarPerfil();
            this.authService.logout();
            this.equipoActivo.limpiar();
            this.router.navigate(['/'], { queryParams: { emailCambiado: '1' } });
          } else {
            this.exitoDatos = 'Datos actualizados.';
          }
        },
        error: (err: Error) => {
          this.errorDatos = err?.message ?? 'No se pudieron guardar los datos.';
          this.guardandoDatos = false;
        },
      });
  }

  get passValido(): boolean {
    return (
      !!this.pass.actual &&
      this.pass.nueva.length >= 6 &&
      this.pass.nueva === this.pass.confirmacion
    );
  }

  cambiarPassword(): void {
    if (!this.passValido) return;
    this.guardandoPass = true;
    this.exitoPass = null;
    this.errorPass = null;
    this.perfilService
      .cambiarPassword({ passwordActual: this.pass.actual, passwordNueva: this.pass.nueva })
      .subscribe({
        next: () => {
          this.pass = { actual: '', nueva: '', confirmacion: '' };
          this.exitoPass = 'Contraseña actualizada.';
          this.guardandoPass = false;
        },
        error: (err: Error) => {
          this.errorPass = err?.message ?? 'No se pudo cambiar la contraseña.';
          this.guardandoPass = false;
        },
      });
  }

  abrirEliminar(): void {
    this.mostrarEliminar = true;
    this.passwordEliminar = '';
    this.errorEliminar = null;
  }

  cerrarEliminar(): void {
    this.mostrarEliminar = false;
  }

  confirmarEliminar(): void {
    if (!this.passwordEliminar) return;
    this.eliminando = true;
    this.errorEliminar = null;
    this.perfilService.eliminarCuenta(this.passwordEliminar).subscribe({
      next: () => {
        this.authService.logout();
        this.equipoActivo.limpiar();
        this.router.navigate(['/'], { queryParams: { cuentaEliminada: '1' } });
      },
      error: (err: Error) => {
        this.errorEliminar = err?.message ?? 'No se pudo eliminar la cuenta.';
        this.eliminando = false;
      },
    });
  }

  fechaFormateada(iso: string): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('es-ES', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
    } catch {
      return iso;
    }
  }

  logout() {
    this.authService.logout();
    this.equipoActivo.limpiar();
    this.router.navigate(['/']);
  }
}
