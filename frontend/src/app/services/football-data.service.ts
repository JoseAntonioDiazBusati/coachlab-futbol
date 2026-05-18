import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
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
    const trimmed = base.trim();
    if (trimmed) {
      window.localStorage.setItem(this.STORAGE_API_BASE, trimmed);
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

  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(this.STORAGE_API_KEY);
  }

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
      'No hay API key configurada. Introduce tu clave de football-data.org para continuar.',
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
      'La API key ya no está disponible. Vuelve al paso anterior e introdúcela de nuevo.',
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
      case 0:
        return (
          'No se pudo conectar con football-data.org (error de red). ' +
          'Posibles causas: sin conexión a internet, CORS bloqueado por el navegador ' +
          'o cortafuegos corporativo. ' +
          `URL base actual: ${this.apiBase}.`
        );
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
