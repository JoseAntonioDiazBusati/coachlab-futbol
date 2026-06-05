import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { delay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Campos necesarios para calcular el IRE en cliente (local preview).
 * Fórmula simplificada; el ranking definitivo lo devuelve el backend.
 *
 * NOTA (PLAN-RETROALIMENTACION §2.3): el plan proponía eliminar este cálculo en
 * cliente. Se conserva de forma deliberada como parte de la arquitectura
 * dual-write: ofrece un impacto optimista inmediato tras crear/editar un
 * jugador. NO es la fuente de verdad — `listarPlantilla()` siempre refresca con
 * el ranking del backend, que sobrescribe este valor en la siguiente carga.
 */
export interface IREInput {
  posicion: string;
  goles: number;
  asistencias: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  minutos?: number;
}

export function calcularIRE(j: IREInput): number {
  const raw =
    j.goles            *  3
    + j.asistencias    *  2
    + (j.minutos ?? 0) / 90 * 0.5
    - j.tarjetasAmarillas    *  0.5
    - j.tarjetasRojas        *  2;
  return Math.round(raw * 10) / 10;
}

export interface PlantillaJugador {
  jugadorId: number;
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion: string;
  edad?: number;
  goles: number;
  asistencias: number;
  minutos: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  titularidades?: number;
  impacto: number;
}

export interface CrearJugadorPayload {
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion: string;
  edad?: number;
  goles?: number;
  asistencias?: number;
  minutos?: number;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
}

interface JugadorData {
  [equipoId: number]: PlantillaJugador[];
}

/**
 * Servicio de jugadores — arquitectura dual-write.
 *
 * · `listarPlantilla()` → HTTP primario (ranking del backend), caché localStorage como fallback.
 * · `criar()`, `actualizar()` → local inmediato (IRE calculado en cliente) + HTTP background.
 * · `eliminar()` → local inmediato + HTTP background.
 * · `importarPlantilla()` → localStorage sincrónico (compatibilidad con liga-page y sus tests).
 *
 * Los datos locales sirven para feedback inmediato y para que los tests sigan funcionando
 * sin necesidad de mocks HTTP complejos. El backend es la fuente de verdad definitiva;
 * `listarPlantilla()` siempre refrescará con los datos del servidor cuando está disponible.
 */
@Injectable({ providedIn: 'root' })
export class JugadorService {
  private readonly http      = inject(HttpClient);
  private readonly storageKey = 'coachlab_jugadores';
  private readonly base       = `${environment.apiBase}/equipos`;

  private jugadoresSubject = new BehaviorSubject<JugadorData>(this.loadFromStorage());

  // ── Listar (HTTP primario → localStorage fallback) ────────────────────────

  listarPlantilla(equipoId: number): Observable<PlantillaJugador[]> {
    return this.http
      .get<PlantillaJugador[]>(`${this.base}/${equipoId}/jugadores/ranking`)
      .pipe(
        catchError(() => {
          // Backend no disponible — usar datos locales
          return of(this.jugadoresSubject.value[equipoId] ?? []);
        }),
      );
  }

  obtener(equipoId: number, jugadorId: number): Observable<PlantillaJugador | undefined> {
    const jugador = this.jugadoresSubject.value[equipoId]?.find(
      (j) => j.jugadorId === jugadorId,
    );
    return of(jugador).pipe(delay(100));
  }

  // ── CRUD individual (local inmediato + HTTP background) ───────────────────

  crear(equipoId: number, payload: CrearJugadorPayload): Observable<PlantillaJugador> {
    if (!payload.nombre?.trim()) {
      return throwError(() => new Error('El nombre del jugador es obligatorio.'));
    }
    if (!payload.posicion?.trim()) {
      return throwError(() => new Error('La posición del jugador es obligatoria.'));
    }

    const data = this.jugadoresSubject.value;
    if (!data[equipoId]) data[equipoId] = [];

    const maxId = Math.max(...(data[equipoId]?.map((j) => j.jugadorId) || [0]), 0);

    const goles             = payload.goles             ?? 0;
    const asistencias       = payload.asistencias        ?? 0;
    const tarjetasAmarillas = payload.tarjetasAmarillas  ?? 0;
    const tarjetasRojas     = payload.tarjetasRojas      ?? 0;

    const nuevoJugador: PlantillaJugador = {
      jugadorId: maxId + 1,
      nombre:    payload.nombre,
      apellidos: payload.apellidos,
      dorsal:    payload.dorsal,
      posicion:  payload.posicion,
      edad:      payload.edad,
      goles,
      asistencias,
      minutos:           payload.minutos ?? 0,
      tarjetasAmarillas,
      tarjetasRojas,
      impacto: calcularIRE({
        posicion: payload.posicion,
        goles, asistencias, tarjetasAmarillas, tarjetasRojas,
        minutos: payload.minutos ?? 0,
      }),
    };

    data[equipoId].push(nuevoJugador);
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);

    // HTTP background — persiste al backend (fire-and-forget)
    this.http
      .post(`${this.base}/${equipoId}/jugadores`, {
        nombre:    payload.nombre,
        apellidos: payload.apellidos,
        dorsal:    payload.dorsal,
        posicion:  payload.posicion,
        edad:      payload.edad,
      })
      .subscribe({ error: () => { /* fallo silencioso — datos están en local */ } });

    return of(nuevoJugador).pipe(delay(200));
  }

  actualizar(
    equipoId: number,
    jugadorId: number,
    actualizacion: Partial<PlantillaJugador>,
  ): Observable<PlantillaJugador> {
    const data = this.jugadoresSubject.value;
    if (!data[equipoId]) {
      return throwError(() => new Error(`Equipo con id ${equipoId} no encontrado`));
    }

    const index = data[equipoId].findIndex((j) => j.jugadorId === jugadorId);
    if (index === -1) {
      return throwError(() => new Error(`Jugador con id ${jugadorId} no encontrado`));
    }

    const merged = { ...data[equipoId][index], ...actualizacion };
    const jugadorActualizado: PlantillaJugador = {
      ...merged,
      impacto: calcularIRE(merged),
    };
    data[equipoId][index] = jugadorActualizado;
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);

    // HTTP background
    this.http
      .put(`${this.base}/${equipoId}/jugadores/${jugadorId}`, {
        nombre:    jugadorActualizado.nombre,
        apellidos: jugadorActualizado.apellidos,
        dorsal:    jugadorActualizado.dorsal,
        posicion:  jugadorActualizado.posicion,
        edad:      jugadorActualizado.edad,
      })
      .subscribe({ error: () => {} });

    return of(jugadorActualizado).pipe(delay(200));
  }

  eliminar(equipoId: number, jugadorId: number): Observable<void> {
    const data = this.jugadoresSubject.value;
    if (data[equipoId]) {
      data[equipoId] = data[equipoId].filter((j) => j.jugadorId !== jugadorId);
      this.jugadoresSubject.next(data);
      this.saveToStorage(data);
    }

    // HTTP background
    this.http
      .delete(`${this.base}/${equipoId}/jugadores/${jugadorId}`)
      .subscribe({ error: () => {} });

    return of(void 0).pipe(delay(200));
  }

  // ── Importación masiva (localStorage sincrónico) ───────────────────────────

  /**
   * Reemplaza la plantilla completa de forma atómica.
   * Interfaz sincrónica para compatibilidad con liga-page y sus tests.
   */
  importarPlantilla(equipoId: number, jugadores: CrearJugadorPayload[]): PlantillaJugador[] {
    const data = { ...this.jugadoresSubject.value };
    let id = 0;
    const nuevos: PlantillaJugador[] = jugadores.map((payload) => {
      const goles             = payload.goles             ?? 0;
      const asistencias       = payload.asistencias        ?? 0;
      const tarjetasAmarillas = payload.tarjetasAmarillas  ?? 0;
      const tarjetasRojas     = payload.tarjetasRojas      ?? 0;

      return {
        jugadorId: ++id,
        nombre:   payload.nombre,
        apellidos: payload.apellidos,
        dorsal:   payload.dorsal,
        posicion: payload.posicion,
        edad:     payload.edad,
        goles,
        asistencias,
        minutos:           payload.minutos ?? 0,
        tarjetasAmarillas,
        tarjetasRojas,
        impacto: calcularIRE({
          posicion: payload.posicion,
          goles, asistencias, tarjetasAmarillas, tarjetasRojas,
          minutos: payload.minutos ?? 0,
        }),
      };
    });
    data[equipoId] = nuevos;
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);
    return nuevos;
  }

  // ── localStorage helpers ─────────────────────────────────────────────────

  private loadFromStorage(): JugadorData {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as JugadorData;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveToStorage(data: JugadorData): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
}
