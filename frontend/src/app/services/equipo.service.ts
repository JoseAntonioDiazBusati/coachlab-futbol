import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Equipo {
  id: number;
  nombre: string;
  categoria?: string;
  temporada?: string;
  ciudad?: string;
}

export interface ResumenTemporada {
  totalPartidos: number;
  victorias: number;
  empates: number;
  derrotas: number;
  totalGolesAFavor: number;
  totalGolesEnContra: number;
  mediaGolesAFavor: number;
  mediaGolesEnContra: number;
  ire: number;
  /** Los 5 resultados más recientes ('VICTORIA' | 'EMPATE' | 'DERROTA'). */
  rachaReciente: string[];
  /**
   * Detalle de los partidos importados desde la API.
   * Sólo presente cuando el equipo fue importado; undefined en otros casos.
   */
  partidos?: { rival: string; fecha: string; esLocal: boolean; golesNuestros: number; golesRivales: number; resultado: string }[];
}

/**
 * Servicio HTTP para gestión de equipos.
 *
 * Todos los endpoints requieren JWT (adjuntado automáticamente por authInterceptor).
 */
@Injectable({ providedIn: 'root' })
export class EquipoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/equipos`;

  listar(): Observable<Equipo[]> {
    return this.http
      .get<Equipo[]>(this.base)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  obtener(id: number): Observable<Equipo> {
    return this.http
      .get<Equipo>(`${this.base}/${id}`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  crear(equipo: Omit<Equipo, 'id'>): Observable<Equipo> {
    return this.http
      .post<Equipo>(this.base, equipo)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  actualizar(id: number, equipo: Partial<Equipo>): Observable<Equipo> {
    return this.http
      .put<Equipo>(`${this.base}/${id}`, equipo)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${id}`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  getResumen(id: number): Observable<ResumenTemporada> {
    return this.http
      .get<ResumenTemporada>(`${this.base}/${id}/resumen`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  private mensajeError(err: { status?: number }): string {
    if (err.status === 401 || err.status === 403) return 'Sesión expirada. Por favor, inicia sesión de nuevo.';
    if (err.status === 404) return 'Equipo no encontrado.';
    if (err.status) return `Error HTTP ${err.status} al acceder a la API.`;
    return 'Error de red. Comprueba tu conexión.';
  }
}
