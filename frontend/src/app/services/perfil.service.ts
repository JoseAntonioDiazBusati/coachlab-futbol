import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Perfil {
  id: number;
  email: string;
  nombre: string;
  fechaRegistro: string;
  totalEquipos: number;
}

/**
 * Servicio HTTP del perfil del usuario autenticado.
 * Todos los endpoints requieren JWT (lo adjunta `authInterceptor`).
 */
@Injectable({ providedIn: 'root' })
export class PerfilService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/perfil`;

  obtener(): Observable<Perfil> {
    return this.http
      .get<Perfil>(this.base)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  actualizar(payload: { nombre: string; email: string }): Observable<Perfil> {
    return this.http
      .put<Perfil>(this.base, payload)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  cambiarPassword(payload: { passwordActual: string; passwordNueva: string }): Observable<void> {
    return this.http
      .put<void>(`${this.base}/password`, payload)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  eliminarCuenta(password: string): Observable<void> {
    return this.http
      .delete<void>(this.base, { body: { password } })
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  private mensajeError(err: { status?: number; error?: { mensaje?: string } }): string {
    if (err?.error?.mensaje) return err.error.mensaje;
    if (err.status === 401) return 'La contraseña no es correcta.';
    if (err.status === 409) return 'El email ya está registrado.';
    if (err.status) return `Error HTTP ${err.status}.`;
    return 'Error de red. Comprueba tu conexión.';
  }
}
