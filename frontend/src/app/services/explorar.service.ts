import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { PlantillaJugador } from './jugador.service';

/** Equipo visible para comparar (vista pública del backend `/api/explorar`). */
export interface EquipoComparacion {
  id: number;
  nombre: string;
  categoria?: string;
  temporada?: string;
  ciudad?: string;
  entrenador?: string;
}

/**
 * Servicio de exploración/comparación de plantillas de otros equipos.
 *
 * Solo lectura. Disponible para entrenadores (ver rivales) y ojeadores
 * (comparar plantillas de la app). Backend: `/api/explorar/**`.
 */
@Injectable({ providedIn: 'root' })
export class ExplorarService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/explorar`;

  /** Lista todos los equipos de la aplicación. */
  listarEquipos(): Observable<EquipoComparacion[]> {
    return this.http
      .get<EquipoComparacion[]>(`${this.base}/equipos`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  /** Plantilla (ranking de impacto) de cualquier equipo. */
  plantilla(equipoId: number): Observable<PlantillaJugador[]> {
    return this.http
      .get<PlantillaJugador[]>(`${this.base}/equipos/${equipoId}/jugadores`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  private mensajeError(err: { status?: number }): string {
    if (err.status === 401 || err.status === 403)
      return 'Sesión expirada. Por favor, inicia sesión de nuevo.';
    if (err.status === 404) return 'Equipo no encontrado.';
    if (err.status) return `Error HTTP ${err.status} al acceder a la API.`;
    return 'Error de red. Comprueba tu conexión.';
  }
}
