import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './services/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Activa la integración Zone.js ↔ Angular CD.
    // Sin este proveedor, Angular 18+ ignora las notificaciones de Zone.js
    // y la UI solo se refresca al interactuar manualmente (click/hover).
    // eventCoalescing: true agrupa múltiples microtareas en un único ciclo CD.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
