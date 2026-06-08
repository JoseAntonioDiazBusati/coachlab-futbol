import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { ComparadorComponent } from '../comparador/comparador.component';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { AuthService } from '../../services/auth.service';

export interface SlotCampo {
  id: number;
  x: number;   // % from left
  y: number;   // % from top  (0 = ataque, 100 = defensa)
  etiqueta: string;
  jugador: PlantillaJugador | null;
}

export type Formacion = '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1';
export type RivalFortaleza = 'debil' | 'normal' | 'fuerte';

const FORMACIONES: Record<Formacion, { x: number; y: number; etiqueta: string }[]> = {
  '4-3-3': [
    { x: 50, y: 88, etiqueta: 'PT' },
    { x: 14, y: 70, etiqueta: 'LD' }, { x: 36, y: 70, etiqueta: 'DC' },
    { x: 64, y: 70, etiqueta: 'DC' }, { x: 86, y: 70, etiqueta: 'LI' },
    { x: 24, y: 47, etiqueta: 'MC' }, { x: 50, y: 47, etiqueta: 'MC' }, { x: 76, y: 47, etiqueta: 'MC' },
    { x: 18, y: 20, etiqueta: 'EX' }, { x: 50, y: 20, etiqueta: 'DEL' }, { x: 82, y: 20, etiqueta: 'EX' },
  ],
  '4-4-2': [
    { x: 50, y: 88, etiqueta: 'PT' },
    { x: 14, y: 70, etiqueta: 'LD' }, { x: 36, y: 70, etiqueta: 'DC' },
    { x: 64, y: 70, etiqueta: 'DC' }, { x: 86, y: 70, etiqueta: 'LI' },
    { x: 14, y: 47, etiqueta: 'MCI' }, { x: 38, y: 47, etiqueta: 'MC' },
    { x: 62, y: 47, etiqueta: 'MC' }, { x: 86, y: 47, etiqueta: 'MCD' },
    { x: 35, y: 20, etiqueta: 'DEL' }, { x: 65, y: 20, etiqueta: 'DEL' },
  ],
  '3-5-2': [
    { x: 50, y: 88, etiqueta: 'PT' },
    { x: 26, y: 70, etiqueta: 'DC' }, { x: 50, y: 70, etiqueta: 'DC' }, { x: 74, y: 70, etiqueta: 'DC' },
    { x: 10, y: 48, etiqueta: 'MCO' }, { x: 30, y: 47, etiqueta: 'MC' }, { x: 50, y: 47, etiqueta: 'MC' },
    { x: 70, y: 47, etiqueta: 'MC' }, { x: 90, y: 48, etiqueta: 'MCO' },
    { x: 35, y: 20, etiqueta: 'DEL' }, { x: 65, y: 20, etiqueta: 'DEL' },
  ],
  '4-2-3-1': [
    { x: 50, y: 88, etiqueta: 'PT' },
    { x: 14, y: 70, etiqueta: 'LD' }, { x: 36, y: 70, etiqueta: 'DC' },
    { x: 64, y: 70, etiqueta: 'DC' }, { x: 86, y: 70, etiqueta: 'LI' },
    { x: 35, y: 57, etiqueta: 'MDF' }, { x: 65, y: 57, etiqueta: 'MDF' },
    { x: 18, y: 34, etiqueta: 'EX' }, { x: 50, y: 32, etiqueta: 'MCO' }, { x: 82, y: 34, etiqueta: 'EX' },
    { x: 50, y: 14, etiqueta: 'DEL' },
  ],
};

const POS_MAP: Record<string, string[]> = {
  PT:  ['Portero'],
  DC:  ['Defensa'], LD: ['Defensa'], LI: ['Defensa'],
  MC:  ['Centrocampista'], MCI: ['Centrocampista'], MCD: ['Centrocampista'],
  MCO: ['Centrocampista'], MDF: ['Centrocampista'],
  EX:  ['Delantero', 'Centrocampista'],
  DEL: ['Delantero'],
};

@Component({
  selector: 'app-prepartido-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DashboardHeaderComponent, ComparadorComponent],
  templateUrl: './prepartido-page.component.html',
  styleUrl: './prepartido-page.component.scss',
})
export class PrepartidoPageComponent implements OnInit {
  private readonly jugadorService = inject(JugadorService);
  private readonly equipoService  = inject(EquipoService);
  private readonly equipoActivo   = inject(EquipoActivoService);
  private readonly authService    = inject(AuthService);

  /** Un ojeador solo compara (ve el comparador); el entrenador solo alinea. */
  readonly esOjeador = this.authService.esOjeador();

  equipo: Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  cargando = false;
  error: string | null = null;

  /** True once loading is done, a team is set, but the squad is empty. */
  get sinJugadores(): boolean {
    return !this.cargando && !this.error && !!this.equipo && this.jugadores.length === 0;
  }

  formacion: Formacion = '4-3-3';
  readonly formaciones: Formacion[] = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1'];
  slots: SlotCampo[] = [];

  jugadorSeleccionado: PlantillaJugador | null = null;
  dragSourceSlotId: number | null = null;
  slotDragOver: number | null = null;

  rivalFortaleza: RivalFortaleza = 'normal';
  rivalNombre = '';

  // ── Computed ─────────────────────────────────────
  get banco(): PlantillaJugador[] {
    const enCampo = new Set(
      this.slots.filter(s => s.jugador !== null).map(s => s.jugador!.jugadorId),
    );
    return this.jugadores.filter(j => !enCampo.has(j.jugadorId));
  }

  get totalEnCampo(): number {
    return this.slots.filter(s => s.jugador !== null).length;
  }

  get probabilidades(): { victoria: number; empate: number; derrota: number } {
    return this.calcularProbabilidades();
  }

  // ── Lifecycle ────────────────────────────────────
  ngOnInit(): void {
    // El ojeador no tiene equipo propio: solo usa el comparador.
    if (!this.esOjeador) this.cargarEquipo();
  }

  cargarEquipo(): void {
    this.cargando = true;
    this.error = null;
    this.equipo = null;
    this.jugadores = [];
    this.slots = [];
    this.equipoService.listar().subscribe({
      next: equipos => {
        const id = this.equipoActivo.getId();
        this.equipo = (id !== null ? equipos.find(e => e.id === id) : null) ?? equipos[0] ?? null;
        if (this.equipo) this.cargarJugadores();
        else this.cargando = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar el equipo.';
        this.cargando = false;
      },
    });
  }

  cargarJugadores(): void {
    if (!this.equipo) return;
    this.jugadorService.listarPlantilla(this.equipo.id).subscribe({
      next: jugadores => {
        this.jugadores = jugadores;
        this.inicializarSlots();
        this.cargando = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar la plantilla.';
        this.cargando = false;
      },
    });
  }

  inicializarSlots(): void {
    const def = FORMACIONES[this.formacion];
    this.slots = def.map((pos, i) => ({
      id: i,
      x: pos.x,
      y: pos.y,
      etiqueta: pos.etiqueta,
      jugador: this.slots[i]?.jugador ?? null,
    }));
  }

  cambiarFormacion(): void {
    const anteriores = this.slots.map(s => s.jugador).filter(Boolean) as PlantillaJugador[];
    this.inicializarSlots();
    anteriores.forEach((j, i) => { if (i < this.slots.length) this.slots[i].jugador = j; });
  }

  // ── Click interaction ────────────────────────────
  clickSlot(slot: SlotCampo): void {
    if (this.jugadorSeleccionado) {
      this.slots.forEach(s => {
        if (s.jugador?.jugadorId === this.jugadorSeleccionado!.jugadorId) s.jugador = null;
      });
      slot.jugador = this.jugadorSeleccionado;
      this.jugadorSeleccionado = null;
    } else if (slot.jugador) {
      this.jugadorSeleccionado = slot.jugador;
      slot.jugador = null;
    }
  }

  clickBanco(jugador: PlantillaJugador): void {
    this.jugadorSeleccionado =
      this.jugadorSeleccionado?.jugadorId === jugador.jugadorId ? null : jugador;
  }

  // ── Drag & drop ──────────────────────────────────
  onBenchDragStart(event: DragEvent, jugador: PlantillaJugador): void {
    this.jugadorSeleccionado = jugador;
    this.dragSourceSlotId = null;
    event.dataTransfer?.setData('text', String(jugador.jugadorId));
  }

  onSlotDragStart(event: DragEvent, slot: SlotCampo): void {
    if (!slot.jugador) { event.preventDefault(); return; }
    this.jugadorSeleccionado = slot.jugador;
    this.dragSourceSlotId = slot.id;
    event.dataTransfer?.setData('text', String(slot.jugador.jugadorId));
  }

  onSlotDragOver(event: DragEvent, slotId: number): void {
    event.preventDefault();
    this.slotDragOver = slotId;
  }

  onSlotDragLeave(): void { this.slotDragOver = null; }

  onSlotDrop(event: DragEvent, target: SlotCampo): void {
    event.preventDefault();
    this.slotDragOver = null;
    if (!this.jugadorSeleccionado) return;

    const displaced = target.jugador;
    target.jugador = this.jugadorSeleccionado;

    if (this.dragSourceSlotId !== null) {
      const src = this.slots.find(s => s.id === this.dragSourceSlotId);
      if (src) src.jugador = displaced;   // swap
    }

    this.jugadorSeleccionado = null;
    this.dragSourceSlotId = null;
  }

  onDragEnd(): void {
    this.jugadorSeleccionado = null;
    this.dragSourceSlotId = null;
    this.slotDragOver = null;
  }

  // ── Bulk actions ─────────────────────────────────
  /**
   * Rellena los huecos vacíos del campo seleccionando el mejor jugador disponible
   * por IRE (`impacto`) para cada posición.
   *
   * Algoritmo de dos pasadas:
   *  1ª pasada – cada slot vacío recibe el jugador con mayor IRE que encaja en
   *              su posición preferida (según POS_MAP).
   *  2ª pasada – los slots que siguen vacíos reciben el mejor jugador restante
   *              independientemente de posición (fallback).
   */
  autoCompletar(): void {
    // Sort bank by IRE descending so `findIndex` always returns the best match first.
    const disponibles = [...this.banco].sort((a, b) => b.impacto - a.impacto);

    // 1ª pasada: position-matched, best-IRE first
    for (const slot of this.slots) {
      if (slot.jugador) continue;
      const prefs = POS_MAP[slot.etiqueta] ?? [];
      const idx = disponibles.findIndex(j => prefs.includes(j.posicion));
      if (idx >= 0) {
        slot.jugador = disponibles.splice(idx, 1)[0];
      }
    }

    // 2ª pasada: fill remaining empty slots with best available (any position)
    for (const slot of this.slots) {
      if (!slot.jugador && disponibles.length > 0) {
        slot.jugador = disponibles.shift()!;
      }
    }
  }

  limpiarCampo(): void {
    this.slots.forEach(s => s.jugador = null);
    this.jugadorSeleccionado = null;
  }

  // ── Dinámica ─────────────────────────────────────
  getUltimos5(j: PlantillaJugador): number[] {
    return Array.from({ length: 5 }, (_, i) => {
      const seed = (j.jugadorId * 31 * (i + 1) + j.goles * 17 + j.minutos * 3) % 60 - 30;
      // IRE is a total-season index (0 = no stats, ~30 = solid contributor, 100+ = elite).
      // Normalize to 0–7.5 for the form base: divide by 10 so IRE 75 → 7.5 (max).
      const base = Math.min(j.impacto / 10, 7.5);
      return Math.round(Math.max(3, Math.min(10, base + seed / 30)));
    });
  }

  getDinamica(j: PlantillaJugador): number {
    const r = this.getUltimos5(j);
    return Math.round(r.reduce((a, b) => a + b, 0) / r.length * 10) / 10;
  }

  getRatingClass(r: number): string {
    return r >= 7 ? 'rating-good' : r >= 5 ? 'rating-ok' : 'rating-bad';
  }

  getDinamicaTrend(j: PlantillaJugador): '↑' | '→' | '↓' {
    const r = this.getUltimos5(j);
    const recent = (r[0] + r[1]) / 2;
    const prev   = (r[3] + r[4]) / 2;
    return recent > prev + 0.5 ? '↑' : recent < prev - 0.5 ? '↓' : '→';
  }

  getTrendClass(j: PlantillaJugador): string {
    const t = this.getDinamicaTrend(j);
    return t === '↑' ? 'trend-up' : t === '↓' ? 'trend-down' : 'trend-flat';
  }

  // ── Probabilidades ───────────────────────────────
  private calcularProbabilidades(): { victoria: number; empate: number; derrota: number } {
    const enCampo = this.slots.filter(s => s.jugador).map(s => s.jugador!);
    if (enCampo.length === 0) return { victoria: 33, empate: 34, derrota: 33 };

    const media  = enCampo.reduce((sum, j) => sum + this.getDinamica(j), 0) / enCampo.length;
    const fuerza = media / 10;  // 0–1

    const mod = this.rivalFortaleza === 'debil' ? 0.12 : this.rivalFortaleza === 'fuerte' ? -0.12 : 0;
    const pW = Math.max(0.08, Math.min(0.70, fuerza * 0.72 + mod));
    const pL = Math.max(0.08, Math.min(0.70, (1 - fuerza) * 0.72 - mod));
    const pD = Math.max(0.10, 1 - pW - pL);
    const total = pW + pD + pL;
    return {
      victoria: Math.round(pW / total * 100),
      empate:   Math.round(pD / total * 100),
      derrota:  Math.round(pL / total * 100),
    };
  }

  // ── Track fns ─────────────────────────────────────
  trackBySlot(_: number, s: SlotCampo): number        { return s.id; }
  trackByJugador(_: number, j: PlantillaJugador): number { return j.jugadorId; }
}
