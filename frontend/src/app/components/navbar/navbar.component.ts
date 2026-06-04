import { Component, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  @Output() login = new EventEmitter<void>();

  scrolled = false;

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.scrolled = window.scrollY > 40;
  }

  onLogin() {
    this.login.emit();
  }
}
