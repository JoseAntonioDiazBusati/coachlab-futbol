import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { PartidoService, PartidoImportado } from './partido.service';

export interface Equipo {
  id: number;
  nombre: string;
  categoria?: string;
  temporada?: string;
  ciudad?: string;
}

export interface ResumenTemporada {
  totalPartidos: number;
  victorias: number;
  empates: number;
  derrotas: number;
  totalGolesAFavor: number;
  totalGolesEnContra: number;
  mediaGolesAFavor: number;
  mediaGolesEnContra: number;
  ire: number;
  /** Los 5 resultados más recientes ('VICTORIA' | 'EMPATE' | 'DERROTA'). */
  rachaReciente: string[];
  /**
   * Detalle de los partidos importados desde la API.
   * Presente únicamente cuando el equipo fue importado con importación completa.
   * Cuando es undefined el dashboard usa el modo de racha sintético.
   */
  partidos?: PartidoImportado[];
}

@Injectable({
  providedIn: 'root',
})
export class EquipoService {
  private readonly storageKey = 'coachlab_equipos';
  private equiposSubject = new BehaviorSubject<Equipo[]>(this.loadFromStorage());
  private readonly partidoService = inject(PartidoService);

  listar(): Observable<Equipo[]> {
    return of(this.equiposSubject.value).pipe(delay(300));
  }

  obtener(id: number): Observable<Equipo | undefined> {
    const equipo = this.equiposSubject.value.find((e) => e.id === id);
    return of(equipo).pipe(delay(100));
  }

  crear(equipo: Omit<Equipo, 'id'>): Observable<Equipo> {
    const newEquipo: Equipo = {
      ...equipo,
      id: Math.max(...this.equiposSubject.value.map((e) => e.id), 0) + 1,
    };
    const updated = [...this.equiposSubject.value, newEquipo];
    this.equiposSubject.next(updated);
    this.saveToStorage(updated);
    return of(newEquipo).pipe(delay(200));
  }

  actualizar(id: number, equipo: Partial<Equipo>): Observable<Equipo> {
    const equipos = this.equiposSubject.value.map((e) =>
      e.id === id ? { ...e, ...equipo } : e,
    );
    const updated = equipos.find((e) => e.id === id);
    if (!updated) {
      return throwError(
        () => new Error(`Equipo con id ${id} no encontrado`),
      );
    }
    this.equiposSubject.next(equipos);
    this.saveToStorage(equipos);
    return of(updated).pipe(delay(200));
  }

  eliminar(id: number): Observable<void> {
    const equipos = this.equiposSubject.value.filter((e) => e.id !== id);
    this.equiposSubject.next(equipos);
    this.saveToStorage(equipos);
    return of(void 0).pipe(delay(200));
  }

  getResumen(id: number): Observable<ResumenTemporada> {
    const partidos = this.partidoService.listar(id);

    if (partidos.length > 0) {
      return of(this.calcularResumen(partidos)).pipe(delay(100));
    }

    // Equipo creado manualmente o sin datos importados — devuelve mock neutro.
    const resumen: ResumenTemporada = {
      totalPartidos: 0,
      victorias: 0,
      empates: 0,
      derrotas: 0,
      totalGolesAFavor: 0,
      totalGolesEnContra: 0,
      mediaGolesAFavor: 0,
      mediaGolesEnContra: 0,
      ire: 0,
      rachaReciente: [],
    };
    return of(resumen).pipe(delay(100));
  }

  private calcularResumen(partidos: PartidoImportado[]): ResumenTemporada {
    const victorias = partidos.filter((p) => p.resultado === 'VICTORIA').length;
    const empates   = partidos.filter((p) => p.resultado === 'EMPATE').length;
    const derrotas  = partidos.filter((p) => p.resultado === 'DERROTA').length;
    const golesF    = partidos.reduce((s, p) => s + p.golesNuestros, 0);
    const golesC    = partidos.reduce((s, p) => s + p.golesRivales,  0);
    const total     = partidos.length;

    const round1 = (n: number) => Math.round(n * 10) / 10;
    const ire     = total > 0 ? Math.round((victorias / total) * 100) : 0;

    // Los partidos están almacenados más-reciente-primero (ver confirmarEquipoApi).
    const rachaReciente = partidos.slice(0, 5).map((p) => p.resultado);

    return {
      totalPartidos:      total,
      victorias,
      empates,
      derrotas,
      totalGolesAFavor:   golesF,
      totalGolesEnContra: golesC,
      mediaGolesAFavor:   total > 0 ? round1(golesF / total) : 0,
      mediaGolesEnContra: total > 0 ? round1(golesC / total) : 0,
      ire,
      rachaReciente,
      partidos,
    };
  }

  private loadFromStorage(): Equipo[] {
    if (typeof window === 'undefined') {
      return [];
    }
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as Equipo[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveToStorage(equipos: Equipo[]): void {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(this.storageKey, JSON.stringify(equipos));
  }
}
