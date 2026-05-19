import { Injectable } from '@angular/core';

/** Representa un partido importado desde football-data.org y persistido localmente. */
export interface PartidoImportado {
  /** Nombre del equipo rival (shortName si está disponible). */
  rival: string;
  /** Fecha del partido en formato ISO (YYYY-MM-DD). */
  fecha: string;
  /** true si el equipo jugó como local. */
  esLocal: boolean;
  /** Goles marcados por el equipo importado. */
  golesNuestros: number;
  /** Goles encajados. */
  golesRivales: number;
  resultado: 'VICTORIA' | 'EMPATE' | 'DERROTA';
}

interface PartidoData {
  [equipoId: number]: PartidoImportado[];
}

/**
 * Persiste partidos importados desde la API football-data.org en localStorage.
 *
 * Diseño intencionalmente simple: un objeto JSON por equipo en una sola clave.
 * La escritura es síncrona (los datos son pequeños), por lo que no hay Observable.
 */
@Injectable({ providedIn: 'root' })
export class PartidoService {
  private readonly storageKey = 'coachlab_partidos';

  /** Devuelve los partidos almacenados para un equipo (o [] si no hay datos). */
  listar(equipoId: number): PartidoImportado[] {
    return this.loadFromStorage()[equipoId] ?? [];
  }

  /**
   * Sobrescribe la lista completa de partidos de un equipo.
   * Llamar con `[]` equivale a `limpiar()`.
   */
  guardar(equipoId: number, partidos: PartidoImportado[]): void {
    const data = this.loadFromStorage();
    data[equipoId] = partidos;
    this.saveToStorage(data);
  }

  /** Elimina todos los partidos almacenados para un equipo. */
  limpiar(equipoId: number): void {
    const data = this.loadFromStorage();
    delete data[equipoId];
    this.saveToStorage(data);
  }

  private loadFromStorage(): PartidoData {
    if (typeof window === 'undefined') return {};
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as PartidoData;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private saveToStorage(data: PartidoData): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
}
