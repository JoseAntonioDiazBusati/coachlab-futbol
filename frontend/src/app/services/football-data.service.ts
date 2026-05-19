import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError, timeout } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
 * Jugador tal como lo devuelve `GET /teams/{id}` (campo `squad`).
 * `position` sigue el vocabulario inglés de football-data.org:
 *   'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' | null
 */
export interface FdJugadorSquad {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth?: string;   // ISO date: "2001-09-05"
  nationality?: string;
  shirtNumber?: number | null;
}

/**
 * Tarjeta en un partido, tal como la devuelve `GET /teams/{id}/matches`.
 * Referencia: https://www.football-data.org/documentation/api#bookings
 */
export interface FdBooking {
  minute: number;
  team: { id: number; name: string };
  player: { id: number; name: string };
  /** YELLOW | RED | YELLOW_RED (doble amarilla → roja directa) */
  card: 'YELLOW' | 'RED' | 'YELLOW_RED';
}

/**
 * Jugador en la alineación titular o en el banquillo.
 * Devuelto dentro de `homeTeam.lineup` / `homeTeam.bench` (y lo mismo para `awayTeam`).
 */
export interface FdLineupPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
}

/**
 * Sustitución realizada durante un partido.
 * Devuelta dentro del array `substitutions` del objeto match.
 */
export interface FdSubstitution {
  minute: number;
  team: { id: number; name: string };
  playerOut: { id: number; name: string };
  playerIn: { id: number; name: string };
}

/** Partido tal como lo devuelve `GET /teams/{id}/matches`. */
export interface FdMatch {
  id: number;
  utcDate: string;   // ISO datetime: "2024-03-15T15:00:00Z"
  status: string;    // 'FINISHED' | 'SCHEDULED' | ...
  competition: { id: number; code: string; name: string };
  homeTeam: {
    id: number;
    name: string;
    shortName?: string;
    /** Alineación titular (disponible en partidos FINISHED). */
    lineup?: FdLineupPlayer[];
    /** Jugadores en el banquillo. */
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
  /** Tarjetas del partido (amarillas/rojas). Puede estar ausente si la API no lo incluye. */
  bookings?: FdBooking[];
  /** Cambios realizados durante el partido. */
  substitutions?: FdSubstitution[];
}

/**
 * Entrada de la tabla de goleadores/asistentes.
 * Devuelta por `GET /competitions/{code}/scorers`.
 */
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
 * Servicio para consumir la API v4 de football-data.org.
 *
 * URL base por prioridad:
 *  1. localStorage 'coachlab_fd_api_base'  → override manual (despliegues custom)
 *  2. environment.fdApiBase                → dev: proxy local / prod: URL directa
 *
 * Referencia oficial: https://www.football-data.org/documentation/api
 */
@Injectable({ providedIn: 'root' })
export class FootballDataService {
  private readonly STORAGE_API_KEY  = 'coachlab_football_api_key';
  private readonly STORAGE_API_BASE = 'coachlab_fd_api_base';
  private readonly REQUEST_TIMEOUT  = 15_000;

  private readonly http = inject(HttpClient);

  // ── API base URL ────────────────────────────────
  /**
   * URL base efectiva.
   * Permite override en localStorage para despliegues que necesiten
   * un proxy propio (e.g. backend BFF) sin tener que recompilar.
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
    // Normalize at storage time so the stored value is always clean.
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

  // ── API key ─────────────────────────────────────
  tieneApiKey(): boolean { return !!this.getApiKey(); }

  /**
   * Returns the effective API key.
   *
   * Priority:
   *  1. localStorage `coachlab_football_api_key`  — developer override (testing, hot-swap)
   *  2. environment.fdApiKey                      — code-configured key (normal usage)
   *  3. null                                      — not configured
   *
   * Regular users never need to set this; the key is embedded in the build
   * via environment.ts / environment.prod.ts.
   */
  getApiKey(): string | null {
    // Developer override: allows swapping the key at runtime without recompiling.
    if (typeof window !== 'undefined') {
      const override = window.localStorage.getItem(this.STORAGE_API_KEY)?.trim();
      if (override) return override;
    }
    const envKey = environment.fdApiKey?.trim();
    return envKey || null;
  }

  /** Store a runtime key override in localStorage (developer / testing use only). */
  setApiKey(key: string): void {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(this.STORAGE_API_KEY, key.trim());
  }

  // ── Peticiones ──────────────────────────────────
  /**
   * Devuelve las competiciones disponibles para la API key.
   * La capa gratuita expone 12 ligas.
   */
  listarCompeticiones(): Observable<FdCompeticion[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error(
      'No hay API key configurada. ' +
      'Define fdApiKey en src/environments/environment.ts (dev) ' +
      'o environment.prod.ts (producción).',
    ));

    return this.http
      .get<{ competitions: FdCompeticion[] }>(`${this.apiBase}/competitions`, {
        headers: { 'X-Auth-Token': key },
      })
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((r) => (r.competitions ?? []).filter((c) => !!c.code)),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /**
   * Devuelve los equipos de una competición por su código (e.g. 'PL', 'PD').
   */
  listarEquipos(codigoCompeticion: string): Observable<FdEquipo[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error(
      'La API key no está disponible. ' +
      'Verifica que fdApiKey está configurada en environment.ts.',
    ));

    return this.http
      .get<{ teams: FdEquipo[] }>(
        `${this.apiBase}/competitions/${codigoCompeticion}/teams`,
        { headers: { 'X-Auth-Token': key } },
      )
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((r) => r.teams ?? []),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /**
   * Devuelve la plantilla (squad) de un equipo por su ID numérico de FD.
   * Endpoint: `GET /teams/{id}`  →  campo `squad`.
   */
  listarPlantillaEquipo(fdTeamId: number): Observable<FdJugadorSquad[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error(
      'La API key no está disponible. ' +
      'Verifica que fdApiKey está configurada en environment.ts.',
    ));

    return this.http
      .get<{ squad: FdJugadorSquad[] }>(
        `${this.apiBase}/teams/${fdTeamId}`,
        { headers: { 'X-Auth-Token': key } },
      )
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((r) => r.squad ?? []),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /**
   * Devuelve los últimos partidos finalizados de un equipo.
   * Endpoint: `GET /teams/{id}/matches?status=FINISHED&limit={limite}[&competitions={competicionId}]`
   *
   * Cuando se pasa `competicionId`, la API solo devuelve partidos de esa competición,
   * lo que evita mezclar LaLiga con Copa del Rey, Champions League, etc.
   *
   * Los resultados vienen ordenados más-reciente-primero desde la API.
   */
  listarPartidosEquipo(
    fdTeamId: number,
    limite = 10,
    competicionId?: number,
  ): Observable<FdMatch[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error(
      'La API key no está disponible. ' +
      'Verifica que fdApiKey está configurada en environment.ts.',
    ));

    // Build params object; only add `competitions` when a filter is requested.
    const params: Record<string, string> = {
      status: 'FINISHED',
      limit:  String(limite),
    };
    if (competicionId !== undefined) {
      params['competitions'] = String(competicionId);
    }

    return this.http
      .get<{ matches: FdMatch[] }>(
        `${this.apiBase}/teams/${fdTeamId}/matches`,
        {
          headers: { 'X-Auth-Token': key },
          params,
        },
      )
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((r) => r.matches ?? []),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /**
   * Devuelve la tabla de goleadores/asistentes de una competición.
   * Endpoint: `GET /competitions/{code}/scorers?season={year}&limit={limite}`
   *
   * `season` debe ser el año de inicio de la temporada (e.g. 2025 para 2025/2026).
   * La capa gratuita limita a las 12 competiciones incluidas en el plan.
   */
  listarGoleadores(
    codigoCompeticion: string,
    season?: number,
    limite = 50,
  ): Observable<FdGoleador[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error(
      'La API key no está disponible. ' +
      'Verifica que fdApiKey está configurada en environment.ts.',
    ));

    const params: Record<string, string> = { limit: String(limite) };
    if (season !== undefined) {
      params['season'] = String(season);
    }

    return this.http
      .get<{ scorers: FdGoleador[] }>(
        `${this.apiBase}/competitions/${codigoCompeticion}/scorers`,
        {
          headers: { 'X-Auth-Token': key },
          params,
        },
      )
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        map((r) => r.scorers ?? []),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  // ── Mensajes de error ───────────────────────────
  /**
   * Traduce los errores HTTP de football-data.org a mensajes legibles.
   *
   * status 0  → red bloqueada o preflight CORS rechazado
   * status 400 → parámetros incorrectos
   * status 403 → API key inválida / plan no autorizado
   * status 429 → rate-limit (free: 10 req/min)
   * status 404 → recurso inexistente en ese plan
   * TimeoutError → sin respuesta en 15 s
   */
  private mensajeError(err: { status?: number; name?: string }): string {
    if (err.name === 'TimeoutError') {
      return 'La petición tardó más de 15 s. Comprueba tu conexión e inténtalo de nuevo.';
    }
    switch (err.status) {
      case 0: {
        // A relative path means we're going through the dev-server proxy.
        // An absolute URL means a direct browser-to-API call (production).
        const usingProxy = !this.apiBase.startsWith('http');
        if (usingProxy) {
          return (
            `Error de red al contactar con el proxy de desarrollo (${this.apiBase}). ` +
            `Comprueba que 'ng serve' está en ejecución ` +
            `y que proxy.conf.json apunta correctamente al destino.`
          );
        }
        return (
          `No se pudo conectar con football-data.org (${this.apiBase}). ` +
          `Posibles causas: sin conexión a internet, CORS bloqueado por el navegador ` +
          `o plan gratuito sin soporte CORS. ` +
          `Si el problema persiste en producción, considera servir la SPA ` +
          `desde un servidor con proxy inverso hacia football-data.org.`
        );
      }
      case 400:
        return 'Petición incorrecta (400). Verifica el código de la competición.';
      case 403:
        return (
          'API key inválida o sin permisos (403). ' +
          'Verifica tu clave en football-data.org. ' +
          'Recuerda que la capa gratuita sólo permite las 12 competiciones incluidas.'
        );
      case 429:
        return (
          'Límite de peticiones alcanzado (429). ' +
          'La capa gratuita permite 10 req/min. ' +
          'Espera unos segundos e inténtalo de nuevo.'
        );
      case 404:
        return 'Recurso no encontrado (404). La liga puede no estar disponible en tu plan.';
      default:
        if (err.status) return `Error HTTP ${err.status} al conectar con football-data.org.`;
        return 'Error desconocido al conectar con football-data.org. Comprueba tu conexión.';
    }
  }
}
