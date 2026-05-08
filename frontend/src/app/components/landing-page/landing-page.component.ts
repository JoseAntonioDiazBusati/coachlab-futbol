import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthPanelComponent, AuthMode } from '../auth/auth-panel/auth-panel.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { HeroComponent } from '../hero/hero.component';
import { FeaturesComponent } from '../features/features.component';
import { CtaBannerComponent } from '../cta-banner/cta-banner.component';
import { FooterComponent } from '../footer/footer.component';

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
  authOpen = false;
  authMode: AuthMode = 'login';

  constructor(private readonly router: Router) {}

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
    this.router.navigate(['/dashboard']);
  }
}
