import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';

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
  impacto: number;
  paradasLimpias?: number;
  golesEncajados?: number;
  penaltisParados?: number;
  partidosTitular?: number;
}

export interface CrearJugadorPayload {
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion: string;
  edad?: number;
}

interface JugadorData {
  [equipoId: number]: PlantillaJugador[];
}

@Injectable({
  providedIn: 'root',
})
export class JugadorService {
  private readonly storageKey = 'coachlab_jugadores';
  private jugadoresSubject = new BehaviorSubject<JugadorData>(
    this.loadFromStorage(),
  );

  listarPlantilla(equipoId: number): Observable<PlantillaJugador[]> {
    const data = this.jugadoresSubject.value[equipoId] || [];
    return of(data).pipe(delay(300));
  }

  obtener(
    equipoId: number,
    jugadorId: number,
  ): Observable<PlantillaJugador | undefined> {
    const jugador = this.jugadoresSubject.value[equipoId]?.find(
      (j) => j.jugadorId === jugadorId,
    );
    return of(jugador).pipe(delay(100));
  }

  crear(
    equipoId: number,
    payload: CrearJugadorPayload,
  ): Observable<PlantillaJugador> {
    if (!payload.nombre?.trim()) {
      return throwError(() => new Error('El nombre del jugador es obligatorio.'));
    }
    if (!payload.posicion?.trim()) {
      return throwError(() => new Error('La posición del jugador es obligatoria.'));
    }

    const data = this.jugadoresSubject.value;
    if (!data[equipoId]) {
      data[equipoId] = [];
    }

    const maxId = Math.max(
      ...(data[equipoId]?.map((j) => j.jugadorId) || [0]),
      0,
    );

    const nuevoJugador: PlantillaJugador = {
      jugadorId: maxId + 1,
      nombre: payload.nombre,
      apellidos: payload.apellidos,
      dorsal: payload.dorsal,
      posicion: payload.posicion,
      edad: payload.edad,
      goles: 0,
      asistencias: 0,
      minutos: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      impacto: 0,
      paradasLimpias: payload.posicion === 'Portero' ? 0 : undefined,
      golesEncajados: payload.posicion === 'Portero' ? 0 : undefined,
      penaltisParados: payload.posicion === 'Portero' ? 0 : undefined,
      partidosTitular:
        payload.posicion !== 'Portero' ? 0 : undefined,
    };

    data[equipoId].push(nuevoJugador);
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);
    return of(nuevoJugador).pipe(delay(200));
  }

  actualizar(
    equipoId: number,
    jugadorId: number,
    actualizacion: Partial<PlantillaJugador>,
  ): Observable<PlantillaJugador> {
    const data = this.jugadoresSubject.value;
    if (!data[equipoId]) {
      return throwError(
        () => new Error(`Equipo con id ${equipoId} no encontrado`),
      );
    }

    const index = data[equipoId].findIndex((j) => j.jugadorId === jugadorId);
    if (index === -1) {
      return throwError(
        () => new Error(`Jugador con id ${jugadorId} no encontrado`),
      );
    }

    const jugadorActualizado = {
      ...data[equipoId][index],
      ...actualizacion,
    };
    data[equipoId][index] = jugadorActualizado;
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);
    return of(jugadorActualizado).pipe(delay(200));
  }

  /**
   * Reemplaza la plantilla completa de un equipo de forma atómica.
   * Pensado para importaciones masivas desde la API — mucho más eficiente
   * que llamar a `crear()` N veces porque sólo escribe localStorage una vez.
   *
   * Los jugadores previos se descartan: llama a `limpiarPlantilla()` antes si
   * quieres preservarlos.
   */
  importarPlantilla(
    equipoId: number,
    jugadores: CrearJugadorPayload[],
  ): PlantillaJugador[] {
    const data = { ...this.jugadoresSubject.value };
    let id = 0;
    const nuevos: PlantillaJugador[] = jugadores.map((payload) => ({
      jugadorId: ++id,
      nombre: payload.nombre,
      apellidos: payload.apellidos,
      dorsal: payload.dorsal,
      posicion: payload.posicion,
      edad: payload.edad,
      goles: 0,
      asistencias: 0,
      minutos: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      impacto: 0,
      paradasLimpias:  payload.posicion === 'Portero' ? 0 : undefined,
      golesEncajados:  payload.posicion === 'Portero' ? 0 : undefined,
      penaltisParados: payload.posicion === 'Portero' ? 0 : undefined,
      partidosTitular: payload.posicion !== 'Portero' ? 0 : undefined,
    }));
    data[equipoId] = nuevos;
    this.jugadoresSubject.next(data);
    this.saveToStorage(data);
    return nuevos;
  }

  eliminar(equipoId: number, jugadorId: number): Observable<void> {
    const data = this.jugadoresSubject.value;
    if (data[equipoId]) {
      data[equipoId] = data[equipoId].filter((j) => j.jugadorId !== jugadorId);
      this.jugadoresSubject.next(data);
      this.saveToStorage(data);
    }
    return of(void 0).pipe(delay(200));
  }

  private loadFromStorage(): JugadorData {
    if (typeof window === 'undefined') {
      return {};
    }
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as JugadorData;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveToStorage(data: JugadorData): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
}
