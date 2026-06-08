import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, finalize, switchMap, takeUntil } from 'rxjs/operators';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { JugadorService, CrearJugadorPayload } from '../../services/jugador.service';
import { PartidoRegistradoService, calcularResultado } from '../../services/partido-registrado.service';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
  FdGoleador,
  FdJugadorSquad,
  FdMatch,
} from '../../services/football-data.service';
import { getCurrentSeason, getCurrentSeasonYear } from '../../utils/temporada.utils';
import { agregarStatsDePartidos, mapFdPosicion, splitNombre } from './liga-page.utils';

// Helpers puros (mapFdPosicion, splitNombre, agregarStatsDePartidos) viven en
// ./liga-page.utils. Se re-exportan para mantener la API previa de este módulo
// (p.ej. tests que importan agregarStatsDePartidos desde el componente).
export { agregarStatsDePartidos, mapFdPosicion, splitNombre } from './liga-page.utils';

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
export class LigaPageComponent implements OnInit, OnDestroy {
  private readonly equipoService  = inject(EquipoService);
  private readonly equipoActivo   = inject(EquipoActivoService);
  private readonly fdService      = inject(FootballDataService);
  private readonly jugadorService = inject(JugadorService);
  private readonly partidoService = inject(PartidoRegistradoService);
  private readonly router         = inject(Router);

  /**
   * Emitting here cancels any in-flight football-data.org request.
   * Used by `abrirPanel()` (toggle close) and `cerrarPanel()`.
   */
  private readonly cancelApi$ = new Subject<void>();

  equipos: Equipo[] = [];
  equipoActivoActual: Equipo | null = null;
  cargando = false;
  guardando = false;
  /** Context-aware message shown in the panel loading spinner. */
  loadingMsg = 'Cargando...';
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

  ngOnDestroy(): void {
    this.cancelApi$.next();
    this.cancelApi$.complete();
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
    // Cancel any in-flight API request from a previous open.
    this.cancelApi$.next();
    this.guardando = false;
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
    this.cancelApi$.next();    // abort any in-flight request
    this.guardando = false;    // guarantee the spinner never gets stuck
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
    this.loadingMsg = 'Cargando ligas disponibles...';
    this.guardando = true;
    this.error = null;
    this.competiciones = [];
    this.fdService
      .listarCompeticiones()
      .pipe(
        takeUntil(this.cancelApi$),
        finalize(() => { this.guardando = false; }),
      )
      .subscribe({
        next: (comps) => { this.competiciones = comps; },
        error: (err: Error) => { this.error = err.message; },
      });
  }

  seleccionarCompeticion(comp: FdCompeticion): void {
    this.competicionSeleccionada = comp;
    this.loadingMsg = `Cargando equipos de ${comp.name}...`;
    this.guardando = true;
    this.error = null;
    this.fdService
      .listarEquipos(comp.code)
      .pipe(
        takeUntil(this.cancelApi$),
        finalize(() => { this.guardando = false; }),
      )
      .subscribe({
        next: (equipos) => {
          this.equiposApi = equipos;
          this.equipoApiSeleccionado = null;
          this.apiPaso = 'equipos';
        },
        error: (err: Error) => {
          this.error = err.message;
          // User stays on 'ligas' and can retry by clicking the competition again.
        },
      });
  }

  confirmarEquipoApi(): void {
    if (!this.equipoApiSeleccionado) return;
    const fd   = this.equipoApiSeleccionado;
    const comp = this.competicionSeleccionada;
    this.loadingMsg = 'Importando equipo y plantilla...';
    this.guardando = true;
    this.error = null;

    this.equipoService
      .crear({
        nombre:    fd.name,
        categoria: comp?.name,
        temporada: getCurrentSeason(),
        ciudad:    fd.area?.name,
      })
      .pipe(
        switchMap((equipo) =>
          forkJoin({
            equipo: of(equipo),
            // Squad, match and scorer calls are non-blocking: a failure here must
            // NOT roll back the team that was already created.
            plantilla: this.fdService.listarPlantillaEquipo(fd.id).pipe(
              catchError(() => of([] as FdJugadorSquad[])),
            ),
            partidos: this.fdService
              .listarPartidosEquipo(fd.id, 10, comp?.id)
              .pipe(
                catchError(() => of([] as FdMatch[])),
              ),
            goleadores: comp
              ? this.fdService
                  .listarGoleadores(comp.code, getCurrentSeasonYear())
                  .pipe(catchError(() => of([] as FdGoleador[])))
              : of([] as FdGoleador[]),
          }),
        ),
        takeUntil(this.cancelApi$),
        finalize(() => { this.guardando = false; }),
      )
      .subscribe({
        next: ({ equipo, plantilla, partidos, goleadores }) => {
          // ── Build scorer lookup: playerId → { goles, asistencias } ──
          const scorerMap = new Map<number, { goles: number; asistencias: number }>();
          for (const g of goleadores) {
            scorerMap.set(g.player.id, {
              goles:       g.goals,
              asistencias: g.assists ?? 0,
            });
          }

          // ── Build match stats: playerId → { amarillas, rojas, minutos } ──
          // Aggregated from bookings[], lineup[] and substitutions[] of each match.
          const matchStatsMap = agregarStatsDePartidos(partidos, fd.id);

          // ── Persist squad ────────────────────────────────────────────
          if (plantilla.length > 0) {
            const payloads: CrearJugadorPayload[] = plantilla.map((j) => {
              const scorer = scorerMap.get(j.id);
              const match  = matchStatsMap.get(j.id);
              const { nombre, apellidos } = splitNombre(j.name);
              return {
                nombre,
                apellidos,
                posicion: mapFdPosicion(j.position),
                dorsal:   j.shirtNumber ?? undefined,
                edad:     j.dateOfBirth
                  ? new Date().getFullYear() -
                    new Date(j.dateOfBirth).getFullYear()
                  : undefined,
                goles:             scorer?.goles       ?? 0,
                asistencias:       scorer?.asistencias ?? 0,
                tarjetasAmarillas: match?.amarillas    ?? 0,
                tarjetasRojas:     match?.rojas             ?? 0,
                minutos:           match?.minutos           ?? 0,
              };
            });
            this.jugadorService.importarPlantilla(equipo.id, payloads);
          }

          // ── Persistir los partidos reales de la API como partidos registrados ──
          // El marcador (resultado de ambos equipos) sí está disponible en el plan
          // gratuito; las estadísticas por jugador no, así que van vacías. El backend
          // es idempotente por externalId (no duplica al reimportar).
          this.persistirPartidosFd(equipo.id, fd.id, partidos);

          // ── Activate & finish ────────────────────────────────────────
          this.equipoActivo.setEquipo(equipo.id);
          this.panelAbierto = 'ninguno';
          this.cargarEquipos();
          this.exito = `${equipo.nombre} importado y activado.`;
          setTimeout(() => (this.exito = null), 3500);
        },
        error: (err: Error) => {
          this.error = err.message;
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

  /**
   * Guarda los partidos finalizados traídos de la API como partidos registrados,
   * usando el marcador real (resultado de ambos equipos). Las estadísticas por
   * jugador van vacías (no disponibles en el plan gratuito). Fire-and-forget: un
   * fallo aquí no debe romper la importación del equipo.
   */
  private persistirPartidosFd(equipoId: number, fdTeamId: number, partidos: FdMatch[]): void {
    for (const m of partidos) {
      const home = m.score?.fullTime?.home;
      const away = m.score?.fullTime?.away;
      if (home == null || away == null) continue;   // sin marcador → no se registra

      const esLocal = m.homeTeam.id === fdTeamId;
      const golesNuestros = esLocal ? home : away;
      const golesRivales  = esLocal ? away : home;
      const rival = esLocal ? m.awayTeam.name : m.homeTeam.name;

      this.partidoService
        .guardar(equipoId, {
          rival,
          fecha: m.utcDate.slice(0, 10),
          esLocal,
          competicion: m.competition?.name ?? 'Liga',
          golesNuestros,
          golesRivales,
          resultado: calcularResultado(golesNuestros, golesRivales),
          jugadoresIds: [],
          estadisticas: [],
          origen: 'FOOTBALL_DATA',
          externalId: m.id,
        })
        .subscribe({ error: () => { /* fallo silencioso */ } });
    }
  }

  private nuevoEquipoManual(): EquipoManual {
    return {
      nombre: '',
      categoria: '',
      temporada: getCurrentSeason(),
      ciudad: '',
    };
  }
}
