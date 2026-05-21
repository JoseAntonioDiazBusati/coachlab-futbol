import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

export type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './auth-panel.component.html',
  styleUrl: './auth-panel.component.scss',
})
export class AuthPanelComponent {
  @Input() open = false;
  @Input() mode: AuthMode = 'login';
  @Output() close = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  private readonly authService = inject(AuthService);

  name     = '';
  email    = '';
  password = '';
  error    = '';
  cargando = false;

  constructor() {
    const defaults = this.authService.getDefaultUser();
    this.email    = defaults.email;
    this.password = defaults.password;
  }

  onSubmit(): void {
    this.error = '';
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail || !this.password.trim()) {
      this.error = 'Completa los campos requeridos.';
      return;
    }
    if (this.cargando) return;

    this.cargando = true;

    const request$ =
      this.mode === 'login'
        ? this.authService.login(trimmedEmail, this.password)
        : this.authService.register(this.name.trim() || 'Usuario', trimmedEmail, this.password);

    request$.subscribe({
      next: () => {
        this.cargando = false;
        this.authenticated.emit();
      },
      error: (err: { status?: number; message?: string }) => {
        this.cargando = false;
        if (err.status === 401 || err.status === 403) {
          this.error = 'Credenciales inválidas.';
        } else if (err.status === 409) {
          this.error = 'El correo ya está registrado.';
        } else if (err.status === 400) {
          this.error = 'Datos inválidos. Revisa el formulario.';
        } else {
          this.error = 'Error al conectar con el servidor. Inténtalo de nuevo.';
        }
      },
    });
  }

  onClose(): void {
    this.close.emit();
  }

  onSwitch(mode: AuthMode): void {
    this.mode  = mode;
    this.error = '';
  }
}

export {};
