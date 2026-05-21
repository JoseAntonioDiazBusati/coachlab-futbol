import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';
import {
  PartidoRegistradoService,
  PartidoRegistrado,
  calcularResultado,
} from '../../services/partido-registrado.service';

/** Estado interno del formulario de nuevo partido. */
export interface NuevoPartidoForm {
  rival: string;
  fecha: string;
  esLocal: boolean;
  competicion: string;
  golesNuestros: number | null;
  golesRivales: number | null;
  jugadoresSeleccionados: Set<number>;
}

@Component({
  selector: 'app-registrar-partido-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './registrar-partido-page.component.html',
  styleUrl: './registrar-partido-page.component.scss',
})
export class RegistrarPartidoPageComponent implements OnInit {
  private readonly equipoService   = inject(EquipoService);
  private readonly equipoActivo    = inject(EquipoActivoService);
  private readonly jugadorService  = inject(JugadorService);
  private readonly partidoService  = inject(PartidoRegistradoService);

  // ── Estado ────────────────────────────────────────
  equipo:   Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  partidos:  PartidoRegistrado[] = [];

  cargando = false;
  error: string | null = null;

  mostrarFormulario = false;
  guardando = false;
  errorFormulario: string | null = null;

  nuevo: NuevoPartidoForm = this.formularioVacio();

  // ── Computed ──────────────────────────────────────
  get formularioValido(): boolean {
    return (
      !!this.nuevo.rival.trim() &&
      !!this.nuevo.fecha &&
      !!this.nuevo.competicion.trim() &&
      this.nuevo.golesNuestros !== null &&
      this.nuevo.golesNuestros >= 0 &&
      this.nuevo.golesRivales !== null &&
      this.nuevo.golesRivales >= 0
    );
  }

  get sinEquipo(): boolean {
    return !this.cargando && !this.error && !this.equipo;
  }

  // ── Lifecycle ─────────────────────────────────────
  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.error = null;
    this.equipo = null;
    this.jugadores = [];
    this.partidos = [];

    this.equipoService.listar().subscribe({
      next: (equipos) => {
        const id = this.equipoActivo.getId();
        this.equipo =
          (id !== null ? equipos.find((e) => e.id === id) : null) ??
          equipos[0] ??
          null;

        if (this.equipo) {
          this.partidos = this.partidoService.listar(this.equipo.id);
          this.cargarJugadores();
        } else {
          this.cargando = false;
        }
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
      next: (jugadores) => {
        this.jugadores = jugadores;
        this.cargando = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar la plantilla.';
        this.cargando = false;
      },
    });
  }

  // ── Formulario ────────────────────────────────────
  abrirFormulario(): void {
    this.nuevo = this.formularioVacio();
    this.errorFormulario = null;
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.errorFormulario = null;
  }

  guardar(): void {
    if (!this.equipo || !this.formularioValido) return;

    const gN = this.nuevo.golesNuestros ?? 0;
    const gR = this.nuevo.golesRivales  ?? 0;

    this.guardando = true;
    this.errorFormulario = null;

    try {
      const partido = this.partidoService.guardar(this.equipo.id, {
        rival:         this.nuevo.rival.trim(),
        fecha:         this.nuevo.fecha,
        esLocal:       this.nuevo.esLocal,
        competicion:   this.nuevo.competicion.trim(),
        golesNuestros: gN,
        golesRivales:  gR,
        resultado:     calcularResultado(gN, gR),
        jugadoresIds:  Array.from(this.nuevo.jugadoresSeleccionados),
      });
      this.partidos = [partido, ...this.partidos];
      this.cerrarFormulario();
    } catch {
      this.errorFormulario = 'No se pudo guardar el partido. Inténtalo de nuevo.';
    } finally {
      this.guardando = false;
    }
  }

  eliminarPartido(id: number): void {
    if (!this.equipo) return;
    this.partidoService.eliminar(this.equipo.id, id);
    this.partidos = this.partidos.filter((p) => p.id !== id);
  }

  // ── Selección de jugadores ────────────────────────
  toggleJugador(id: number): void {
    if (this.nuevo.jugadoresSeleccionados.has(id)) {
      this.nuevo.jugadoresSeleccionados.delete(id);
    } else {
      this.nuevo.jugadoresSeleccionados.add(id);
    }
  }

  jugadorEstaSeleccionado(id: number): boolean {
    return this.nuevo.jugadoresSeleccionados.has(id);
  }

  seleccionarTodos(): void {
    this.jugadores.forEach((j) =>
      this.nuevo.jugadoresSeleccionados.add(j.jugadorId),
    );
  }

  deseleccionarTodos(): void {
    this.nuevo.jugadoresSeleccionados.clear();
  }

  // ── Helpers de presentación ───────────────────────
  jugadoresDelPartido(p: PartidoRegistrado): PlantillaJugador[] {
    const ids = new Set(p.jugadoresIds);
    return this.jugadores.filter((j) => ids.has(j.jugadorId));
  }

  resultadoClass(r: 'VICTORIA' | 'EMPATE' | 'DERROTA'): string {
    return r === 'VICTORIA' ? 'win' : r === 'DERROTA' ? 'loss' : 'draw';
  }

  resultadoLabel(r: 'VICTORIA' | 'EMPATE' | 'DERROTA'): string {
    return r === 'VICTORIA' ? 'Victoria' : r === 'DERROTA' ? 'Derrota' : 'Empate';
  }

  fechaFormateada(fecha: string): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }

  condicionLabel(esLocal: boolean): string {
    return esLocal ? 'Local' : 'Visitante';
  }

  // ── Track fns ─────────────────────────────────────
  trackById(_: number, p: PartidoRegistrado): number      { return p.id; }
  trackByJugador(_: number, j: PlantillaJugador): number  { return j.jugadorId; }

  // ── Private ───────────────────────────────────────
  private formularioVacio(): NuevoPartidoForm {
    return {
      rival:                 '',
      fecha:                 new Date().toISOString().slice(0, 10),
      esLocal:               true,
      competicion:           '',
      golesNuestros:         null,
      golesRivales:          null,
      jugadoresSeleccionados: new Set<number>(),
    };
  }
}
