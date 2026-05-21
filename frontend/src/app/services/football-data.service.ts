import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface FdCompeticion {
  id: number;
  code: string;
  name: string;
  area: { name: string };
  emblem?: string;
}

export interface FdEquipo {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  area: { name: string };
  crest?: string;
}

/**
 * Jugador tal como lo devuelve `GET /api/fd/teams/{id}`.
 * `position` sigue el vocabulario inglés de football-data.org.
 */
export interface FdJugadorSquad {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth?: string;
  nationality?: string;
  shirtNumber?: number | null;
}

export interface FdBooking {
  minute: number;
  team: { id: number; name: string };
  player: { id: number; name: string };
  /** YELLOW | RED | YELLOW_RED */
  card: 'YELLOW' | 'RED' | 'YELLOW_RED';
}

export interface FdLineupPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
}

export interface FdSubstitution {
  minute: number;
  team: { id: number; name: string };
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

export interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  competition: { id: number; code: string; name: string };
  homeTeam: {
    id: number;
    name: string;
    shortName?: string;
    lineup?: FdLineupPlayer[];
    bench?: FdLineupPlayer[];
  };
  awayTeam: {
    id: number;
    name: string;
    shortName?: string;
    lineup?: FdLineupPlayer[];
    bench?: FdLineupPlayer[];
  };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
  bookings?: FdBooking[];
  substitutions?: FdSubstitution[];
}

export interface FdGoleador {
  player: {
    id: number;
    name: string;
    shirtNumber?: number | null;
    position?: string | null;
    dateOfBirth?: string;
  };
  team: { id: number; name: string };
  playedMatches: number;
  goals: number;
  assists: number | null;
  penalties: number;
}

/**
 * Servicio para consumir el proxy BFF de football-data.org.
 *
 * Todas las peticiones van al backend CoachLab (`/api/fd/*`), que
 * añade la API key de football-data.org en el servidor.
 * El navegador nunca ve la clave de API.
 *
 * Requiere JWT válido (adjuntado por authInterceptor).
 */
@Injectable({ providedIn: 'root' })
export class FootballDataService {
  private readonly REQUEST_TIMEOUT = 20_000;
  private readonly http = inject(HttpClient);

  private readonly STORAGE_API_BASE = 'coachlab_fd_api_base';

  // ── API base (override opcional para dev avanzado) ────────────────────────
  /**
   * URL base efectiva para el proxy BFF.
   * Permite override en localStorage para casos avanzados de desarrollo.
   * En producción siempre apunta a /api/fd (Nginx → backend).
   */
  private get apiBase(): string {
    if (typeof window !== 'undefined') {
      const override = window.localStorage.getItem(this.STORAGE_API_BASE);
      if (override?.trim()) return override.trim().replace(/\/+$/, '');
    }
    return environment.fdApiBase;
  }

  getApiBase(): string { return this.apiBase; }

  setApiBase(base: string): void {
    if (typeof window === 'undefined') return;
    const normalized = base.trim().replace(/\/+$/, '');
    if (normalized) {
      window.localStorage.setItem(this.STORAGE_API_BASE, normalized);
    } else {
      window.localStorage.removeItem(this.STORAGE_API_BASE);
    }
  }

  resetApiBase(): void {
    if (typeof window !== 'undefined')
      window.localStorage.removeItem(this.STORAGE_API_BASE);
  }

  // ── API key: siempre null en la nueva arquitectura BFF ───────────────────
  /** @deprecated La API key vive exclusivamente en el servidor. Siempre devuelve null. */
  getApiKey(): string | null { return null; }

  /** @deprecated No-op — la API key se configura en el backend via variables de entorno. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setApiKey(_key: string): void { /* no-op */ }

  /** @deprecated La API key está configurada si el backend responde correctamente. */
  tieneApiKey(): boolean { return true; }

  // ── Peticiones ───────────────────────────────────────────────────────────

  /**
   * Devuelve las competiciones disponibles para la API key del servidor.
   */
  listarCompeticiones(): Observable<FdCompeticion[]> {
    return this.http
      .get<FdCompeticion[]>(`${this.apiBase}/competiciones`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  listarEquipos(codigoCompeticion: string): Observable<FdEquipo[]> {
    return this.http
      .get<FdEquipo[]>(`${this.apiBase}/competiciones/${codigoCompeticion}/equipos`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  listarPlantillaEquipo(fdTeamId: number): Observable<FdJugadorSquad[]> {
    return this.http
      .get<FdJugadorSquad[]>(`${this.apiBase}/teams/${fdTeamId}`)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  listarPartidosEquipo(
    fdTeamId: number,
    limite = 10,
    competicionId?: number,
  ): Observable<FdMatch[]> {
    const params: Record<string, string> = { limit: String(limite) };
    if (competicionId !== undefined) {
      params['competicionId'] = String(competicionId);
    }

    return this.http
      .get<FdMatch[]>(`${this.apiBase}/teams/${fdTeamId}/matches`, { params })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  listarGoleadores(
    codigoCompeticion: string,
    season?: number,
    limite = 50,
  ): Observable<FdGoleador[]> {
    const params: Record<string, string> = { limit: String(limite) };
    if (season !== undefined) {
      params['season'] = String(season);
    }

    return this.http
      .get<FdGoleador[]>(`${this.apiBase}/competiciones/${codigoCompeticion}/scorers`, { params })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  // ── Mensajes de error ────────────────────────────────────────────────────
  private mensajeError(err: { status?: number; name?: string }): string {
    if (err.name === 'TimeoutError') {
      return 'La petición tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.';
    }
    switch (err.status) {
      case 401:
      case 403:
        return 'Sesión expirada o sin permisos. Por favor, inicia sesión de nuevo.';
      case 404:
        return 'Recurso no encontrado. La liga puede no estar disponible en tu plan.';
      case 429:
        return 'Límite de peticiones alcanzado (429). Espera unos segundos e inténtalo de nuevo.';
      case 0:
        return 'No se pudo conectar con el servidor. Comprueba tu conexión.';
      default:
        if (err.status) return `Error HTTP ${err.status} al conectar con el servidor.`;
        return 'Error desconocido. Comprueba tu conexión.';
    }
  }
}
