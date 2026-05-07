import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  onLogin() {
    // TODO: Implementar lógica de inicio de sesión
  }

  onTryFree() {
    // TODO: Implementar redirección a formulario de registro
  }
}

