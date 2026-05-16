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

  constructor() {
    this.ensureSeedData();
  }

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

  eliminar(equipoId: number, jugadorId: number): Observable<void> {
    const data = this.jugadoresSubject.value;
    if (data[equipoId]) {
      data[equipoId] = data[equipoId].filter((j) => j.jugadorId !== jugadorId);
      this.jugadoresSubject.next(data);
      this.saveToStorage(data);
    }
    return of(void 0).pipe(delay(200));
  }

  private ensureSeedData(): void {
    const data = this.jugadoresSubject.value;
    if (!data[1] || data[1].length === 0) {
      const seedData: JugadorData = {
        1: [
          {
            jugadorId: 1,
            nombre: 'Carlos',
            apellidos: 'García López',
            dorsal: 1,
            posicion: 'Portero',
            edad: 28,
            goles: 0,
            asistencias: 0,
            minutos: 900,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            impacto: 1.2,
            paradasLimpias: 8,
            golesEncajados: 5,
            penaltisParados: 1,
          },
          {
            jugadorId: 2,
            nombre: 'Juan',
            apellidos: 'Martínez González',
            dorsal: 4,
            posicion: 'Defensa',
            edad: 26,
            goles: 1,
            asistencias: 0,
            minutos: 810,
            tarjetasAmarillas: 2,
            tarjetasRojas: 0,
            impacto: 0.8,
            partidosTitular: 9,
          },
          {
            jugadorId: 3,
            nombre: 'Pedro',
            apellidos: 'Rodríguez Silva',
            dorsal: 5,
            posicion: 'Defensa',
            edad: 24,
            goles: 0,
            asistencias: 1,
            minutos: 720,
            tarjetasAmarillas: 1,
            tarjetasRojas: 0,
            impacto: 0.6,
            partidosTitular: 8,
          },
          {
            jugadorId: 4,
            nombre: 'Miguel',
            apellidos: 'Hernández Ruiz',
            dorsal: 8,
            posicion: 'Centrocampista',
            edad: 25,
            goles: 2,
            asistencias: 3,
            minutos: 720,
            tarjetasAmarillas: 3,
            tarjetasRojas: 0,
            impacto: 1.4,
            partidosTitular: 8,
          },
          {
            jugadorId: 5,
            nombre: 'Diego',
            apellidos: 'López Pérez',
            dorsal: 10,
            posicion: 'Delantero',
            edad: 23,
            goles: 5,
            asistencias: 2,
            minutos: 650,
            tarjetasAmarillas: 1,
            tarjetasRojas: 0,
            impacto: 2.1,
            partidosTitular: 7,
          },
        ],
        2: [
          {
            jugadorId: 1,
            nombre: 'Alberto',
            apellidos: 'Fernández Sanz',
            dorsal: 1,
            posicion: 'Portero',
            edad: 30,
            goles: 0,
            asistencias: 0,
            minutos: 810,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            impacto: 0.9,
            paradasLimpias: 6,
            golesEncajados: 8,
            penaltisParados: 0,
          },
          {
            jugadorId: 2,
            nombre: 'Ricardo',
            apellidos: 'Jiménez Martín',
            dorsal: 3,
            posicion: 'Defensa',
            edad: 27,
            goles: 0,
            asistencias: 0,
            minutos: 810,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            impacto: 0.5,
            partidosTitular: 9,
          },
        ],
        3: [
          {
            jugadorId: 1,
            nombre: 'Lucas',
            apellidos: 'Gómez Díaz',
            dorsal: 7,
            posicion: 'Delantero',
            edad: 18,
            goles: 3,
            asistencias: 1,
            minutos: 450,
            tarjetasAmarillas: 2,
            tarjetasRojas: 0,
            impacto: 1.5,
            partidosTitular: 5,
          },
        ],
      };

      this.jugadoresSubject.next(seedData);
      this.saveToStorage(seedData);
    }
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
