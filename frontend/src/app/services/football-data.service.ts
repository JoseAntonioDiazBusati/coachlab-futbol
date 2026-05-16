import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  private readonly apiBase = 'https://api.football-data.org/v4';
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
        map((r) => r.competitions.filter((c) => !!c.code)),
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
        map((r) => r.teams),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  private mensajeError(err: { status?: number }): string {
    if (err.status === 403) return 'API key inválida o sin permisos. Verifica tu key en football-data.org.';
    if (err.status === 429) return 'Límite de peticiones alcanzado. Espera un momento e inténtalo de nuevo.';
    if (err.status === 404) return 'Liga no encontrada.';
    return 'Error al conectar con football-data.org. Comprueba tu conexión.';
  }
}
