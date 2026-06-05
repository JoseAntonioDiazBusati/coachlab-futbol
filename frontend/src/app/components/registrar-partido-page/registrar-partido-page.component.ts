import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';
import {
  PartidoRegistradoService,
  PartidoRegistrado,
  PartidoDetalle,
  EstadisticaParticipacion,
  calcularResultado,
} from '../../services/partido-registrado.service';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
  FdMatch,
} from '../../services/football-data.service';

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
  imports: [FormsModule, DashboardHeaderComponent],
  templateUrl: './registrar-partido-page.component.html',
  styleUrl: './registrar-partido-page.component.scss',
})
export class RegistrarPartidoPageComponent implements OnInit {
  private readonly equipoService   = inject(EquipoService);
  private readonly equipoActivo    = inject(EquipoActivoService);
  private readonly jugadorService  = inject(JugadorService);
  private readonly partidoService  = inject(PartidoRegistradoService);
  private readonly fdService       = inject(FootballDataService);

  // ── Estado ────────────────────────────────────────
  equipo:   Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  partidos:  PartidoRegistrado[] = [];

  cargando = false;
  error: string | null = null;

  mostrarFormulario = false;
  guardando = false;
  errorFormulario: string | null = null;

  // ── Detalle inline ────────────────────────────────
  partidoExpandidoId: number | null = null;
  detallesCache = new Map<number, PartidoDetalle>();
  cargandoDetalle = false;
  errorDetalle: string | null = null;

  nuevo: NuevoPartidoForm = this.formularioVacio();

  /**
   * Eventos por jugador del formulario en curso, indexados por `jugadorId`.
   * Se mantiene fuera de `NuevoPartidoForm` para no alterar su forma (los tests
   * construyen ese objeto literalmente). Una entrada existe solo mientras el
   * jugador está seleccionado como participante.
   */
  estadisticasParticipacion = new Map<number, EstadisticaParticipacion>();

  /** Origen del partido en curso (se fija a FOOTBALL_DATA al importar). */
  importOrigen: 'MANUAL' | 'FOOTBALL_DATA' = 'MANUAL';
  /** Id del match FD del partido en curso (solo en importaciones). */
  importExternalId: number | null = null;

  // ── Importador football-data.org ──────────────────
  mostrarImportador = false;
  importPaso: 'ligas' | 'equipos' | 'partidos' = 'ligas';
  importCargando = false;
  importError: string | null = null;
  competiciones: FdCompeticion[] = [];
  equiposApi: FdEquipo[] = [];
  partidosApi: FdMatch[] = [];
  competicionSel: FdCompeticion | null = null;
  equipoApiSel: FdEquipo | null = null;

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
          this.cargarPartidos();
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

  cargarPartidos(): void {
    if (!this.equipo) return;
    this.partidoService.listar(this.equipo.id).subscribe({
      next: (partidos) => { this.partidos = partidos; },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudieron cargar los partidos.';
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
    this.estadisticasParticipacion.clear();
    this.importOrigen = 'MANUAL';
    this.importExternalId = null;
    this.errorFormulario = null;
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.errorFormulario = null;
    this.importOrigen = 'MANUAL';
    this.importExternalId = null;
  }

  // ── Importador football-data.org ──────────────────
  abrirImportador(): void {
    this.mostrarImportador = true;
    this.importPaso = 'ligas';
    this.importError = null;
    this.competicionSel = null;
    this.equipoApiSel = null;
    this.equiposApi = [];
    this.partidosApi = [];
    if (this.competiciones.length === 0) this.cargarCompeticionesFd();
  }

  cerrarImportador(): void {
    this.mostrarImportador = false;
    this.importCargando = false;
    this.importError = null;
  }

  cargarCompeticionesFd(): void {
    this.importCargando = true;
    this.importError = null;
    this.fdService.listarCompeticiones().subscribe({
      next: (comps) => { this.competiciones = comps; this.importCargando = false; },
      error: (err: Error) => { this.importError = err.message; this.importCargando = false; },
    });
  }

  seleccionarCompeticionFd(comp: FdCompeticion): void {
    this.competicionSel = comp;
    this.importCargando = true;
    this.importError = null;
    this.fdService.listarEquipos(comp.code).subscribe({
      next: (equipos) => {
        this.equiposApi = equipos;
        this.importPaso = 'equipos';
        this.importCargando = false;
      },
      error: (err: Error) => { this.importError = err.message; this.importCargando = false; },
    });
  }

  seleccionarEquipoFd(equipo: FdEquipo): void {
    this.equipoApiSel = equipo;
    this.importCargando = true;
    this.importError = null;
    this.fdService.listarPartidosEquipo(equipo.id, 20, this.competicionSel?.id).subscribe({
      next: (partidos) => {
        this.partidosApi = partidos;
        this.importPaso = 'partidos';
        this.importCargando = false;
      },
      error: (err: Error) => { this.importError = err.message; this.importCargando = false; },
    });
  }

  /**
   * Carga la previa editable del partido FD y la vuelca en el formulario de
   * nuevo partido (que el usuario puede completar/corregir antes de guardar).
   */
  seleccionarPartidoFd(match: FdMatch): void {
    if (!this.equipo || !this.equipoApiSel) return;
    this.importCargando = true;
    this.importError = null;
    this.partidoService
      .previewFd(this.equipo.id, match.id, this.equipoApiSel.id)
      .subscribe({
        next: (preview) => {
          this.nuevo = {
            rival:       preview.rival,
            fecha:       preview.fecha,
            esLocal:     preview.esLocal,
            competicion: preview.competicion ?? '',
            golesNuestros: preview.golesAFavor ?? 0,
            golesRivales:  preview.golesEnContra ?? 0,
            jugadoresSeleccionados: new Set(preview.estadisticas.map((e) => e.jugadorId)),
          };
          this.estadisticasParticipacion.clear();
          for (const e of preview.estadisticas) {
            this.estadisticasParticipacion.set(e.jugadorId, { ...e });
          }
          this.importOrigen = 'FOOTBALL_DATA';
          this.importExternalId = preview.externalId;
          this.importCargando = false;
          this.mostrarImportador = false;
          this.errorFormulario = null;
          this.mostrarFormulario = true;
        },
        error: (err: Error) => { this.importError = err.message; this.importCargando = false; },
      });
  }

  volverImportPaso(): void {
    if (this.importPaso === 'partidos') this.importPaso = 'equipos';
    else if (this.importPaso === 'equipos') this.importPaso = 'ligas';
    this.importError = null;
  }

  /** Etiqueta corta del marcador de un FdMatch (desde la perspectiva neutra). */
  marcadorFd(m: FdMatch): string {
    const h = m.score.fullTime.home ?? '-';
    const a = m.score.fullTime.away ?? '-';
    return `${h} – ${a}`;
  }

  guardar(): void {
    if (!this.equipo || !this.formularioValido) return;

    const gN = this.nuevo.golesNuestros ?? 0;
    const gR = this.nuevo.golesRivales  ?? 0;

    this.guardando = true;
    this.errorFormulario = null;

    const jugadoresIds = Array.from(this.nuevo.jugadoresSeleccionados);

    this.partidoService
      .guardar(this.equipo.id, {
        rival:         this.nuevo.rival.trim(),
        fecha:         this.nuevo.fecha,
        esLocal:       this.nuevo.esLocal,
        competicion:   this.nuevo.competicion.trim(),
        golesNuestros: gN,
        golesRivales:  gR,
        resultado:     calcularResultado(gN, gR),
        jugadoresIds,
        estadisticas:  this.construirEstadisticas(jugadoresIds),
        origen:        this.importOrigen,
        externalId:    this.importExternalId,
      })
      .subscribe({
        next: (partido) => {
          this.partidos = [partido, ...this.partidos];
          this.guardando = false;
          this.cerrarFormulario();
        },
        error: () => {
          this.errorFormulario = 'No se pudo guardar el partido. Inténtalo de nuevo.';
          this.guardando = false;
        },
      });
  }

  /**
   * Construye el array de estadísticas para los jugadores seleccionados,
   * usando ceros por defecto si el jugador no tiene fila de eventos todavía.
   */
  private construirEstadisticas(jugadoresIds: number[]): EstadisticaParticipacion[] {
    return jugadoresIds.map(
      (id) => this.estadisticasParticipacion.get(id) ?? this.statsVacias(id),
    );
  }

  private statsVacias(jugadorId: number): EstadisticaParticipacion {
    return {
      jugadorId,
      goles: 0,
      asistencias: 0,
      minutosJugados: 0,
      tarjetasAmarillas: 0,
      tarjetasRojas: 0,
      esTitular: true,
    };
  }

  /** Devuelve (creando si hace falta) la fila de eventos de un jugador. */
  statsDe(jugadorId: number): EstadisticaParticipacion {
    let stats = this.estadisticasParticipacion.get(jugadorId);
    if (!stats) {
      stats = this.statsVacias(jugadorId);
      this.estadisticasParticipacion.set(jugadorId, stats);
    }
    return stats;
  }

  /** Suma de goles asignados a jugadores. */
  get golesAsignados(): number {
    let total = 0;
    for (const id of this.nuevo.jugadoresSeleccionados) {
      total += this.estadisticasParticipacion.get(id)?.goles ?? 0;
    }
    return total;
  }

  /**
   * Aviso blando: los goles asignados a jugadores superan el marcador del equipo.
   * No bloquea el guardado, solo informa.
   */
  get avisoGolesIncoherentes(): boolean {
    return (
      this.nuevo.golesNuestros !== null &&
      this.golesAsignados > this.nuevo.golesNuestros
    );
  }

  eliminarPartido(id: number): void {
    if (!this.equipo) return;
    const equipoId = this.equipo.id;
    this.partidoService.eliminar(equipoId, id).subscribe({
      next: () => {
        this.partidos = this.partidos.filter((p) => p.id !== id);
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo eliminar el partido.';
      },
    });
  }

  // ── Selección de jugadores ────────────────────────
  toggleJugador(id: number): void {
    if (this.nuevo.jugadoresSeleccionados.has(id)) {
      this.nuevo.jugadoresSeleccionados.delete(id);
      this.estadisticasParticipacion.delete(id);
    } else {
      this.nuevo.jugadoresSeleccionados.add(id);
      this.statsDe(id); // inicializa la fila de eventos
    }
  }

  jugadorEstaSeleccionado(id: number): boolean {
    return this.nuevo.jugadoresSeleccionados.has(id);
  }

  seleccionarTodos(): void {
    this.jugadores.forEach((j) => {
      this.nuevo.jugadoresSeleccionados.add(j.jugadorId);
      this.statsDe(j.jugadorId);
    });
  }

  deseleccionarTodos(): void {
    this.nuevo.jugadoresSeleccionados.clear();
    this.estadisticasParticipacion.clear();
  }

  // ── Helpers de presentación ───────────────────────
  jugadoresDelPartido(p: PartidoRegistrado): PlantillaJugador[] {
    const ids = new Set(p.jugadoresIds);
    return this.jugadores.filter((j) => ids.has(j.jugadorId));
  }

  /** Jugadores seleccionados como participantes (para la tabla de eventos). */
  get jugadoresSeleccionadosList(): PlantillaJugador[] {
    return this.jugadores.filter((j) =>
      this.nuevo.jugadoresSeleccionados.has(j.jugadorId),
    );
  }

  /**
   * Filas de la tabla de eventos: cada jugador seleccionado con su objeto de
   * estadísticas mutable (apto para `[(ngModel)]`).
   */
  get filasEventos(): { jugador: PlantillaJugador; stats: EstadisticaParticipacion }[] {
    return this.jugadoresSeleccionadosList.map((jugador) => ({
      jugador,
      stats: this.statsDe(jugador.jugadorId),
    }));
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

  // ── Detalle inline ────────────────────────────────
  toggleDetalle(p: PartidoRegistrado): void {
    if (this.partidoExpandidoId === p.id) {
      this.partidoExpandidoId = null;
      return;
    }
    this.partidoExpandidoId = p.id;
    if (this.detallesCache.has(p.id)) return;
    if (!this.equipo) return;
    this.cargandoDetalle = true;
    this.errorDetalle = null;
    this.partidoService.obtenerDetalle(this.equipo.id, p.id).subscribe({
      next: (d) => { this.detallesCache.set(p.id, d); this.cargandoDetalle = false; },
      error: (err: Error) => { this.errorDetalle = err?.message ?? 'No se pudo cargar el detalle.'; this.cargandoDetalle = false; },
    });
  }

  detalleExpandido(id: number): PartidoDetalle | null {
    return this.detallesCache.get(id) ?? null;
  }

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
