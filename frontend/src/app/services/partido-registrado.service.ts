import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Estadística individual de un jugador en un partido (eventos registrados).
 * `jugadorId` referencia al id del jugador en el backend (el mismo que devuelve
 * `/jugadores/ranking`).
 */
export interface EstadisticaParticipacion {
  jugadorId: number;
  goles: number;
  asistencias: number;
  minutosJugados: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  esTitular: boolean;
}

/** Estadística enriquecida tal como la devuelve el backend (incluye datos del jugador). */
export interface EstadisticaDetalle extends EstadisticaParticipacion {
  nombre: string;
  posicion: string;
  dorsal?: number;
  impacto: number;
}

/** Detalle de partido tal como lo devuelve el backend (`PartidoDetalleDTO`). */
export interface PartidoDetalle {
  id: number;
  fecha: string;
  rival: string;
  esLocal: boolean;
  golesAFavor: number | null;
  golesEnContra: number | null;
  competicion: string | null;
  origen: 'MANUAL' | 'FOOTBALL_DATA';
  externalId: number | null;
  resultado: 'VICTORIA' | 'EMPATE' | 'DERROTA' | null;
  observaciones: string | null;
  estadisticas: EstadisticaDetalle[];
}

/**
 * Partido registrado, modelo de la UI.
 * Se proyecta desde `PartidoDetalle` del backend.
 */
export interface PartidoRegistrado {
  id: number;
  rival: string;
  fecha: string;
  esLocal: boolean;
  competicion: string;
  golesNuestros: number;
  golesRivales: number;
  resultado: 'VICTORIA' | 'EMPATE' | 'DERROTA';
  /** IDs de jugadores que participaron (derivado de las estadísticas). */
  jugadoresIds: number[];
  /** Eventos por jugador (goles, asistencias, minutos, tarjetas). */
  estadisticas?: EstadisticaParticipacion[];
  origen?: 'MANUAL' | 'FOOTBALL_DATA';
  externalId?: number | null;
}

/** Previa editable de un partido importado de football-data.org (`PartidoConEstadisticasDTO`). */
export interface PreviewPartidoFd {
  fecha: string;
  rival: string;
  esLocal: boolean;
  golesAFavor: number | null;
  golesEnContra: number | null;
  competicion: string | null;
  origen: 'MANUAL' | 'FOOTBALL_DATA';
  externalId: number | null;
  estadisticas: EstadisticaParticipacion[];
}

/** Calcula el resultado a partir de los goles. */
export function calcularResultado(
  golesNuestros: number,
  golesRivales: number,
): 'VICTORIA' | 'EMPATE' | 'DERROTA' {
  if (golesNuestros > golesRivales) return 'VICTORIA';
  if (golesNuestros < golesRivales) return 'DERROTA';
  return 'EMPATE';
}

/**
 * Servicio HTTP de partidos registrados.
 *
 * Fuente de verdad: el backend (`/api/equipos/{id}/partidos`). Cada partido se
 * persiste con sus estadísticas por jugador vía el endpoint `/full`, de modo
 * que el ranking de impacto y el resumen del equipo reflejen los eventos.
 *
 * Todos los endpoints requieren JWT (lo adjunta automáticamente `authInterceptor`).
 */
@Injectable({ providedIn: 'root' })
export class PartidoRegistradoService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/equipos`;

  /** Lista los partidos del equipo (más recientes primero, los ordena el backend). */
  listar(equipoId: number): Observable<PartidoRegistrado[]> {
    return this.http
      .get<PartidoDetalle[]>(`${this.base}/${equipoId}/partidos`)
      .pipe(
        map((partidos) => partidos.map((p) => this.mapDetalle(p))),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /** Detalle de un partido (con estadísticas enriquecidas para la vista de detalle). */
  obtenerDetalle(equipoId: number, partidoId: number): Observable<PartidoDetalle> {
    return this.http
      .get<PartidoDetalle>(`${this.base}/${equipoId}/partidos/${partidoId}`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  /**
   * Crea un partido con sus estadísticas por jugador (`POST /partidos/full`).
   * Devuelve el partido ya persistido (con el id del backend).
   */
  guardar(
    equipoId: number,
    payload: Omit<PartidoRegistrado, 'id'>,
  ): Observable<PartidoRegistrado> {
    return this.http
      .post<PartidoDetalle>(`${this.base}/${equipoId}/partidos/full`, {
        fecha:         payload.fecha,
        rival:         payload.rival,
        esLocal:       payload.esLocal,
        golesAFavor:   payload.golesNuestros,
        golesEnContra: payload.golesRivales,
        competicion:   payload.competicion,
        origen:        payload.origen ?? 'MANUAL',
        externalId:    payload.externalId ?? null,
        estadisticas:  payload.estadisticas ?? [],
      })
      .pipe(
        map((p) => this.mapDetalle(p)),
        catchError((err) => throwError(() => new Error(this.mensajeError(err)))),
      );
  }

  /** Elimina un partido por su id. */
  eliminar(equipoId: number, partidoId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.base}/${equipoId}/partidos/${partidoId}`)
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  /**
   * Previa editable de un partido de football-data.org.
   * En el plan gratuito las estadísticas llegarán vacías (solo marcador).
   */
  previewFd(
    equipoId: number,
    fdMatchId: number,
    fdTeamId: number,
  ): Observable<PreviewPartidoFd> {
    return this.http
      .get<PreviewPartidoFd>(`${this.base}/${equipoId}/partidos/preview-fd`, {
        params: { fdMatchId: String(fdMatchId), fdTeamId: String(fdTeamId) },
      })
      .pipe(catchError((err) => throwError(() => new Error(this.mensajeError(err)))));
  }

  // ── Mapeo backend → modelo de UI ───────────────────────────────────────────

  private mapDetalle(d: PartidoDetalle): PartidoRegistrado {
    const golesNuestros = d.golesAFavor ?? 0;
    const golesRivales = d.golesEnContra ?? 0;
    const estadisticas = (d.estadisticas ?? []).map((e) => ({
      jugadorId: e.jugadorId,
      goles: e.goles,
      asistencias: e.asistencias,
      minutosJugados: e.minutosJugados,
      tarjetasAmarillas: e.tarjetasAmarillas,
      tarjetasRojas: e.tarjetasRojas,
      esTitular: e.esTitular ?? false,
    }));
    return {
      id: d.id,
      rival: d.rival,
      fecha: d.fecha,
      esLocal: d.esLocal,
      competicion: d.competicion ?? '',
      golesNuestros,
      golesRivales,
      resultado: d.resultado ?? calcularResultado(golesNuestros, golesRivales),
      jugadoresIds: estadisticas.map((e) => e.jugadorId),
      estadisticas,
      origen: d.origen,
      externalId: d.externalId,
    };
  }

  private mensajeError(err: { status?: number }): string {
    if (err.status === 401 || err.status === 403)
      return 'Sesión expirada. Por favor, inicia sesión de nuevo.';
    if (err.status === 404) return 'Partido no encontrado.';
    if (err.status) return `Error HTTP ${err.status} al acceder a la API.`;
    return 'Error de red. Comprueba tu conexión.';
  }
}
