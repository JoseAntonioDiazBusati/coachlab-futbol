import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';

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

@Injectable({ providedIn: 'root' })
export class FootballDataService {
  private readonly apiBase = '/fd-api/v4';
  private readonly storageKey = 'coachlab_football_api_key';
  private readonly http = inject(HttpClient);

  tieneApiKey(): boolean {
    return !!this.getApiKey();
  }

  getApiKey(): string | null {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(this.storageKey);
  }

  setApiKey(key: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, key.trim());
    }
  }

  listarCompeticiones(): Observable<FdCompeticion[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error('Sin API key configurada.'));
    return this.http
      .get<{ competitions: FdCompeticion[] }>(`${this.apiBase}/competitions`, {
        headers: { 'X-Auth-Token': key },
      })
      .pipe(
        timeout(15000),
        map((r) => (r.competitions ?? []).filter((c) => !!c.code)),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  listarEquipos(codigoCompeticion: string): Observable<FdEquipo[]> {
    const key = this.getApiKey();
    if (!key) return throwError(() => new Error('Sin API key configurada.'));
    return this.http
      .get<{ teams: FdEquipo[] }>(
        `${this.apiBase}/competitions/${codigoCompeticion}/teams`,
        { headers: { 'X-Auth-Token': key } },
      )
      .pipe(
        timeout(15000),
        map((r) => r.teams ?? []),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  private mensajeError(err: { status?: number; name?: string }): string {
    if (err.name === 'TimeoutError') return 'La petición tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.';
    if (err.status === 403) return 'API key inválida o sin permisos (403). Verifica tu key en football-data.org.';
    if (err.status === 429) return 'Límite de peticiones alcanzado (429). Espera un momento e inténtalo de nuevo.';
    if (err.status === 404) return 'Liga no encontrada (404).';
    if (err.status) return `Error ${err.status} al conectar con football-data.org.`;
    return 'Error al conectar con football-data.org. Comprueba tu conexión.';
  }
}
