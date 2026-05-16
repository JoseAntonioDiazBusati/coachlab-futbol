import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, catchError } from 'rxjs/operators';

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
  rachaReciente: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EquipoService {
  private readonly storageKey = 'coachlab_equipos';
  private equiposSubject = new BehaviorSubject<Equipo[]>(this.loadFromStorage());

  constructor() {
    this.ensureSeedData();
  }

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
    const resumen: ResumenTemporada = {
      totalPartidos: 10,
      victorias: 7,
      empates: 1,
      derrotas: 2,
      totalGolesAFavor: 28,
      totalGolesEnContra: 12,
      mediaGolesAFavor: 2.8,
      mediaGolesEnContra: 1.2,
      ire: 75,
      rachaReciente: ['VICTORIA', 'VICTORIA', 'EMPATE', 'VICTORIA', 'DERROTA'],
    };
    return of(resumen).pipe(delay(300));
  }

  private ensureSeedData(): void {
    const equipos = this.equiposSubject.value;
    if (equipos.length === 0) {
      const seedEquipos: Equipo[] = [
        {
          id: 1,
          nombre: 'Equipo A',
          categoria: 'Primera División',
          temporada: '2023/2024',
          ciudad: 'Madrid',
        },
        {
          id: 2,
          nombre: 'Equipo B',
          categoria: 'Segunda División',
          temporada: '2023/2024',
          ciudad: 'Barcelona',
        },
        {
          id: 3,
          nombre: 'Equipo C',
          categoria: 'Juveniles',
          temporada: '2023/2024',
          ciudad: 'Valencia',
        },
      ];
      this.equiposSubject.next(seedEquipos);
      this.saveToStorage(seedEquipos);
    }
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
