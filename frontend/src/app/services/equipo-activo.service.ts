import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EquipoActivoService {
  private readonly storageKey = 'coachlab_equipo_activo';
  private idSubject = new BehaviorSubject<number | null>(this.leerStorage());

  tieneEquipo(): boolean {
    return this.idSubject.value !== null;
  }

  getId(): number | null {
    return this.idSubject.value;
  }

  setEquipo(id: number): void {
    this.idSubject.next(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.storageKey, String(id));
    }
  }

  limpiar(): void {
    this.idSubject.next(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(this.storageKey);
    }
  }

  private leerStorage(): number | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(this.storageKey);
    if (!raw) return null;
    const id = parseInt(raw, 10);
    return isNaN(id) ? null : id;
  }
}
