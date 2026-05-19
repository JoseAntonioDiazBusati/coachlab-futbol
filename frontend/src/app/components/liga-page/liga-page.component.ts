import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
} from '../../services/football-data.service';

type Panel = 'ninguno' | 'api' | 'manual';
type ApiPaso = 'ligas' | 'equipos';

interface EquipoManual {
  nombre: string;
  categoria: string;
  temporada: string;
  ciudad: string;
}

@Component({
  selector: 'app-liga-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './liga-page.component.html',
  styleUrl: './liga-page.component.scss',
})
export class LigaPageComponent implements OnInit {
  private readonly equipoService = inject(EquipoService);
  private readonly equipoActivo = inject(EquipoActivoService);
  private readonly fdService = inject(FootballDataService);
  private readonly router = inject(Router);

  equipos: Equipo[] = [];
  equipoActivoActual: Equipo | null = null;
  cargando = false;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;

  panelAbierto: Panel = 'ninguno';

  // API flow
  apiPaso: ApiPaso = 'ligas';
  competiciones: FdCompeticion[] = [];
  competicionSeleccionada: FdCompeticion | null = null;
  equiposApi: FdEquipo[] = [];
  equipoApiSeleccionado: FdEquipo | null = null;

  // Advanced URL configuration (collapsed by default, developer/admin use)
  mostrarAvanzado = false;
  apiBaseInput = '';

  /** Current effective base URL (environment default or localStorage override). */
  get apiBaseActual(): string {
    return this.fdService.getApiBase();
  }

  // Manual flow
  equipoManual: EquipoManual = this.nuevoEquipoManual();

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.cargando = true;
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        const id = this.equipoActivo.getId();
        this.equipoActivoActual = equipos.find((e) => e.id === id) ?? null;
        this.cargando = false;
      },
      error: (err: Error) => {
        this.error = err.message ?? 'Error al cargar equipos.';
        this.cargando = false;
      },
    });
  }

  activarEquipo(equipo: Equipo): void {
    this.equipoActivo.setEquipo(equipo.id);
    this.equipoActivoActual = equipo;
    this.exito = `${equipo.nombre} es ahora tu equipo activo.`;
    setTimeout(() => (this.exito = null), 3500);
  }

  eliminarEquipo(equipo: Equipo): void {
    if (equipo.id === this.equipoActivo.getId()) {
      this.error = 'No puedes eliminar el equipo activo. Activa otro primero.';
      return;
    }
    this.equipoService.eliminar(equipo.id).subscribe({
      next: () => {
        this.exito = `${equipo.nombre} eliminado.`;
        setTimeout(() => (this.exito = null), 3500);
        this.cargarEquipos();
      },
      error: (err: Error) => {
        this.error = err.message ?? 'Error al eliminar equipo.';
      },
    });
  }

  abrirPanel(panel: Panel): void {
    this.error = null;
    if (this.panelAbierto === panel) {
      this.panelAbierto = 'ninguno';
      return;
    }
    this.panelAbierto = panel;
    if (panel === 'api') {
      this.apiBaseInput = this.fdService.getApiBase();
      this.mostrarAvanzado = false;
      this.apiPaso = 'ligas';
      this.competiciones = [];
      this.competicionSeleccionada = null;
      this.equiposApi = [];
      this.equipoApiSeleccionado = null;
      // Load competitions immediately — no key-entry step needed.
      this.cargarCompeticiones();
    }
    if (panel === 'manual') {
      this.equipoManual = this.nuevoEquipoManual();
    }
  }

  cerrarPanel(): void {
    this.panelAbierto = 'ninguno';
    this.mostrarAvanzado = false;
    this.error = null;
  }

  // ── Advanced URL config ──────────────────────
  /**
   * Persist the user-supplied base URL (or clear it if empty).
   * After saving, re-syncs `apiBaseInput` to the normalized stored value
   * so the field reflects exactly what was committed.
   */
  guardarApiBase(): void {
    this.fdService.setApiBase(this.apiBaseInput);
    // Re-read so the input shows the normalized (slash-stripped) value.
    this.apiBaseInput = this.fdService.getApiBase();
    this.exito = 'URL base actualizada. Se aplicará en la próxima llamada a la API.';
    setTimeout(() => (this.exito = null), 4000);
  }

  /** Remove the localStorage override and fall back to the environment default. */
  resetearApiBase(): void {
    this.fdService.resetApiBase();
    this.apiBaseInput = this.fdService.getApiBase();
  }

  // ── API flow ─────────────────────────────────
  /** Load the list of competitions. Called automatically when the panel opens, and on retry. */
  cargarCompeticiones(): void {
    this.guardando = true;
    this.error = null;
    this.competiciones = [];
    this.fdService.listarCompeticiones().subscribe({
      next: (comps) => {
        this.competiciones = comps;
        this.guardando = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.guardando = false;
      },
    });
  }

  seleccionarCompeticion(comp: FdCompeticion): void {
    this.competicionSeleccionada = comp;
    this.guardando = true;
    this.error = null;
    this.fdService.listarEquipos(comp.code).subscribe({
      next: (equipos) => {
        this.equiposApi = equipos;
        this.equipoApiSeleccionado = null;
        this.guardando = false;
        this.apiPaso = 'equipos';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.guardando = false;
        // The error banner describes the problem; the user stays on 'ligas'
        // and can retry or adjust the URL via the advanced settings (⚙).
      },
    });
  }

  confirmarEquipoApi(): void {
    if (!this.equipoApiSeleccionado) return;
    const fd = this.equipoApiSeleccionado;
    this.guardando = true;
    this.error = null;
    this.equipoService
      .crear({
        nombre: fd.name,
        categoria: this.competicionSeleccionada?.name,
        temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        ciudad: fd.area?.name,
      })
      .subscribe({
        next: (equipo) => {
          this.equipoActivo.setEquipo(equipo.id);
          this.guardando = false;
          this.panelAbierto = 'ninguno';
          this.cargarEquipos();
          this.exito = `${equipo.nombre} importado y activado.`;
          setTimeout(() => (this.exito = null), 3500);
        },
        error: (err: Error) => {
          this.error = err.message;
          this.guardando = false;
        },
      });
  }

  // ── Manual flow ──────────────────────────────
  crearEquipoManual(): void {
    if (!this.equipoManual.nombre.trim()) {
      this.error = 'El nombre del equipo es obligatorio.';
      return;
    }
    this.guardando = true;
    this.error = null;
    this.equipoService
      .crear({
        nombre: this.equipoManual.nombre.trim(),
        categoria: this.equipoManual.categoria.trim() || undefined,
        temporada: this.equipoManual.temporada.trim() || undefined,
        ciudad: this.equipoManual.ciudad.trim() || undefined,
      })
      .subscribe({
        next: (equipo) => {
          this.equipoActivo.setEquipo(equipo.id);
          this.guardando = false;
          this.panelAbierto = 'ninguno';
          // Navigate to plantilla so the user can add players immediately.
          // The ?nuevo=true flag auto-opens the add-player form.
          this.router.navigate(['/plantilla'], {
            queryParams: { equipoId: equipo.id, nuevo: 'true' },
          });
        },
        error: (err: Error) => {
          this.error = err.message;
          this.guardando = false;
        },
      });
  }

  volverApiPaso(): void {
    // Only called from 'equipos' → go back to the league selection.
    this.apiPaso = 'ligas';
    this.error = null;
  }

  irAPlantilla(): void {
    this.router.navigate(['/plantilla']);
  }

  private nuevoEquipoManual(): EquipoManual {
    return {
      nombre: '',
      categoria: '',
      temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      ciudad: '',
    };
  }
}
