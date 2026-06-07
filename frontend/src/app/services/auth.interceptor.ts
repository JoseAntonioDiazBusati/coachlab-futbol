import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const JWT_KEY = 'coachlab_jwt';

/**
 * Adjunta el JWT de CoachLab a todas las peticiones HTTP salientes y gestiona
 * de forma global la expiración de sesión.
 *
 * - El token solo se añade si existe en localStorage, por lo que los endpoints
 *   públicos (/api/auth/login, /api/auth/register) también funcionan.
 * - Si el backend responde 401 (token inválido o caducado) en una petición
 *   autenticada, se limpia la sesión y se redirige al inicio. No se actúa sobre
 *   los propios endpoints de auth (un 401 ahí es "credenciales incorrectas") ni
 *   sobre 403 (denegación por rol, p.ej. un ojeador: la sesión sigue siendo válida).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);

  const token =
    typeof window !== 'undefined' ? window.localStorage.getItem(JWT_KEY) : null;

  const handledReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(handledReq).pipe(
    catchError((err: HttpErrorResponse) => {
      const esEndpointAuth = req.url.includes('/api/auth/');
      if (err.status === 401 && !esEndpointAuth && auth.isAuthenticated()) {
        auth.logout();
        router.navigate(['/'], { queryParams: { sesionExpirada: '1' } });
      }
      return throwError(() => err);
    }),
  );
};
