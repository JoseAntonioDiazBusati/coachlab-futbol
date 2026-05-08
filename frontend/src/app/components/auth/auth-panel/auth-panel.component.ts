import { Component, EventEmitter, Input, Output } from '@angular/core';
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

  name = '';
  email = '';
  password = '';
  error = '';

  constructor(private readonly authService: AuthService) {
    const defaults = this.authService.getDefaultUser();
    this.email = defaults.email;
    this.password = defaults.password;
  }

  onSubmit() {
    this.error = '';
    const trimmedEmail = this.email.trim();
    if (!trimmedEmail || !this.password.trim()) {
      this.error = 'Completa los campos requeridos.';
      return;
    }

    const success =
      this.mode === 'login'
        ? this.authService.login(trimmedEmail, this.password)
        : this.authService.register(this.name.trim() || 'Usuario', trimmedEmail, this.password);

    if (!success) {
      this.error = this.mode === 'login' ? 'Credenciales invalidas.' : 'El correo ya existe.';
      return;
    }

    this.authenticated.emit();
  }

  onClose() {
    this.close.emit();
  }

  onSwitch(mode: AuthMode) {
    this.mode = mode;
    this.error = '';
  }
}

export {};

