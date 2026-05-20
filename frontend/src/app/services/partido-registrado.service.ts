import { Injectable } from '@angular/core';

/**
 * Partido registrado manualmente por el entrenador.
 * Complementa (sin reemplazar) a `PartidoImportado`, que viene de la API.
 */
export interface PartidoRegistrado {
  id: number;
  /** Nombre del equipo rival. */
  rival: string;
  /** Fecha del partido en formato ISO (YYYY-MM-DD). */
  fecha: string;
  /** true = el equipo jugó como local. */
  esLocal: boolean;
  /** Nombre de la competición (Liga, Copa, amistoso…). */
  competicion: string;
  /** Goles marcados por el equipo del usuario. */
  golesNuestros: number;
  /** Goles encajados. */
  golesRivales: number;
  resultado: 'VICTORIA' | 'EMPATE' | 'DERROTA';
  /** IDs de `PlantillaJugador` que participaron en el partido. */
  jugadoresIds: number[];
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

interface Data {
  [equipoId: number]: PartidoRegistrado[];
}

/**
 * Persiste los partidos registrados manualmente en localStorage.
 * Clave de almacenamiento: `coachlab_partidos_registrados`.
 *
 * Los partidos se almacenan en orden más-reciente-primero.
 */
@Injectable({ providedIn: 'root' })
export class PartidoRegistradoService {
  private readonly storageKey = 'coachlab_partidos_registrados';

  /** Devuelve todos los partidos del equipo (más recientes primero). */
  listar(equipoId: number): PartidoRegistrado[] {
    return this.load()[equipoId] ?? [];
  }

  /**
   * Crea y persiste un nuevo partido.
   * Asigna un id auto-incremental y lo inserta al principio de la lista.
   */
  guardar(
    equipoId: number,
    payload: Omit<PartidoRegistrado, 'id'>,
  ): PartidoRegistrado {
    const data = this.load();
    const lista = data[equipoId] ?? [];
    const maxId = lista.length > 0 ? Math.max(...lista.map((p) => p.id)) : 0;
    const nuevo: PartidoRegistrado = { id: maxId + 1, ...payload };
    data[equipoId] = [nuevo, ...lista];
    this.save(data);
    return nuevo;
  }

  /** Elimina un partido por su id. No lanza error si no existe. */
  eliminar(equipoId: number, partidoId: number): void {
    const data = this.load();
    if (!data[equipoId]) return;
    data[equipoId] = data[equipoId].filter((p) => p.id !== partidoId);
    this.save(data);
  }

  /** Elimina todos los partidos de un equipo. */
  limpiar(equipoId: number): void {
    const data = this.load();
    delete data[equipoId];
    this.save(data);
  }

  private load(): Data {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Data;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private save(data: Data): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(this.storageKey, JSON.stringify(data));
  }
}
