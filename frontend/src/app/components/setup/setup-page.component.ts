import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
} from '../../services/football-data.service';
import { EquipoService } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import {
  JugadorService,
  PlantillaJugador,
  CrearJugadorPayload,
} from '../../services/jugador.service';

type Paso = 'metodo' | 'api-key' | 'api-ligas' | 'api-equipos' | 'manual' | 'jugadores';

interface EquipoManual {
  nombre: string;
  categoria: string;
  temporada: string;
  ciudad: string;
}

@Component({
  selector: 'app-setup-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup-page.component.html',
  styleUrl: './setup-page.component.scss',
})
export class SetupPageComponent {
  private readonly router        = inject(Router);
  private readonly fdService     = inject(FootballDataService);
  private readonly equipoService = inject(EquipoService);
  private readonly equipoActivo  = inject(EquipoActivoService);
  private readonly jugadorService = inject(JugadorService);

  // ── Wizard state ─────────────────────────────────
  paso: Paso = 'metodo';
  cargando = false;
  error: string | null = null;

  // ── API flow ─────────────────────────────────────
  apiKey = this.fdService.getApiKey() ?? '';
  competiciones: FdCompeticion[] = [];
  competicionSeleccionada: FdCompeticion | null = null;
  equiposApi: FdEquipo[] = [];
  equipoApiSeleccionado: FdEquipo | null = null;

  // ── Manual flow ──────────────────────────────────
  equipoManual: EquipoManual = {
    nombre: '',
    categoria: '',
    temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    ciudad: '',
  };

  // ── Jugadores step ───────────────────────────────
  equipoRecienCreadoId: number | null = null;
  equipoRecienCreadoNombre = '';
  jugadoresAgregados: PlantillaJugador[] = [];
  guardandoJugador = false;

  readonly posiciones = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

  nuevoJugador: CrearJugadorPayload = this.jugadorVacio();

  // ── Navigation ───────────────────────────────────
  elegirMetodo(metodo: 'api' | 'manual'): void {
    this.error = null;
    this.paso = metodo === 'api' ? 'api-key' : 'manual';
  }

  volver(): void {
    this.error = null;
    const prevPaso: Record<Paso, Paso> = {
      'metodo':     'metodo',
      'api-key':    'metodo',
      'api-ligas':  'api-key',
      'api-equipos': 'api-ligas',
      'manual':     'metodo',
      'jugadores':  'manual',   // safety fallback (button not shown in this step)
    };
    this.paso = prevPaso[this.paso];
  }

  // ── API flow methods ─────────────────────────────
  cargarCompeticiones(): void {
    if (!this.apiKey.trim()) {
      this.error = 'Introduce una API key válida.';
      return;
    }
    this.fdService.setApiKey(this.apiKey);
    this.cargando = true;
    this.error = null;
    this.fdService.listarCompeticiones().subscribe({
      next: (comps) => {
        this.competiciones = comps;
        this.cargando = false;
        this.paso = 'api-ligas';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.cargando = false;
      },
    });
  }

  seleccionarCompeticion(comp: FdCompeticion): void {
    this.competicionSeleccionada = comp;
    this.cargando = true;
    this.error = null;
    this.fdService.listarEquipos(comp.code).subscribe({
      next: (equipos) => {
        this.equiposApi = equipos;
        this.equipoApiSeleccionado = null;
        this.cargando = false;
        this.paso = 'api-equipos';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.cargando = false;
      },
    });
  }

  confirmarEquipoApi(): void {
    if (!this.equipoApiSeleccionado) {
      this.error = 'Selecciona un equipo primero.';
      return;
    }
    const fd = this.equipoApiSeleccionado;
    this.cargando = true;
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
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.error = err.message;
          this.cargando = false;
        },
      });
  }

  // ── Manual flow methods ──────────────────────────
  crearEquipoManual(): void {
    if (!this.equipoManual.nombre.trim()) {
      this.error = 'El nombre del equipo es obligatorio.';
      return;
    }
    this.cargando = true;
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
          this.equipoRecienCreadoId = equipo.id;
          this.equipoRecienCreadoNombre = equipo.nombre;
          this.jugadoresAgregados = [];
          this.nuevoJugador = this.jugadorVacio();
          this.cargando = false;
          this.paso = 'jugadores';   // ← go to player-addition step, not dashboard
        },
        error: (err: Error) => {
          this.error = err.message;
          this.cargando = false;
        },
      });
  }

  // ── Jugadores step methods ───────────────────────
  agregarJugador(): void {
    if (!this.nuevoJugador.nombre.trim()) {
      this.error = 'El nombre del jugador es obligatorio.';
      return;
    }
    if (!this.nuevoJugador.posicion) {
      this.error = 'Selecciona una posición para el jugador.';
      return;
    }
    if (this.equipoRecienCreadoId === null || this.guardandoJugador) return;

    this.error = null;
    this.guardandoJugador = true;

    this.jugadorService.crear(this.equipoRecienCreadoId, this.nuevoJugador).subscribe({
      next: (jugador) => {
        this.jugadoresAgregados = [...this.jugadoresAgregados, jugador];
        this.nuevoJugador = this.jugadorVacio();
        this.guardandoJugador = false;
      },
      error: (err: Error) => {
        this.error = err.message;
        this.guardandoJugador = false;
      },
    });
  }

  quitarJugador(jugadorId: number): void {
    if (this.equipoRecienCreadoId === null) return;
    this.jugadorService.eliminar(this.equipoRecienCreadoId, jugadorId).subscribe({
      next: () => {
        this.jugadoresAgregados = this.jugadoresAgregados.filter(
          j => j.jugadorId !== jugadorId,
        );
      },
    });
  }

  /** Navigate to plantilla to see the newly added players. */
  verPlantilla(): void {
    this.router.navigate(['/plantilla'], {
      queryParams: { equipoId: this.equipoRecienCreadoId },
    });
  }

  /** Skip player addition and go straight to the dashboard. */
  saltarJugadores(): void {
    this.router.navigate(['/dashboard']);
  }

  // ── Helpers ─────────────────────────────────────
  private jugadorVacio(): CrearJugadorPayload {
    return { nombre: '', apellidos: '', dorsal: undefined, posicion: '', edad: undefined };
  }
}
