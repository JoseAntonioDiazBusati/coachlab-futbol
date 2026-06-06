import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { Observable, of, Subject, throwError } from 'rxjs';
import { LigaPageComponent, agregarStatsDePartidos } from './liga-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { JugadorService } from '../../services/jugador.service';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
  FdGoleador,
  FdJugadorSquad,
  FdMatch,
  FdBooking,
  FdLineupPlayer,
  FdSubstitution,
} from '../../services/football-data.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const COMP_MOCK: FdCompeticion = {
  id: 2021,
  code: 'PL',
  name: 'Premier League',
  area: { name: 'England' },
};

const FD_EQUIPO_MOCK: FdEquipo = {
  id: 57,
  name: 'Arsenal FC',
  shortName: 'Arsenal',
  tla: 'ARS',
  area: { name: 'England' },
};

const EQUIPO_CREADO_MOCK: Equipo = {
  id: 99,
  nombre: 'Arsenal FC',
  categoria: 'Premier League',
  temporada: '2025/2026',
  ciudad: 'England',
};

const SQUAD_MOCK: FdJugadorSquad[] = [
  { id: 1, name: 'Bukayo Saka',     position: 'Attacker',   shirtNumber: 7  },
  { id: 2, name: 'David Raya',      position: 'Goalkeeper', shirtNumber: 22 },
  { id: 3, name: 'William Saliba',  position: 'Defender',   shirtNumber: 12 },
];

const MATCH_MOCK: FdMatch = {
  id: 1001,
  utcDate: '2024-03-15T15:00:00Z',
  status: 'FINISHED',
  competition: { id: 2021, code: 'PL', name: 'Premier League' },
  homeTeam: { id: 57, name: 'Arsenal FC',   shortName: 'Arsenal'   },
  awayTeam: { id: 64, name: 'Liverpool FC', shortName: 'Liverpool' },
  score: { fullTime: { home: 2, away: 1 } },
};

const GOLEADOR_MOCK: FdGoleador = {
  player: { id: 1, name: 'Bukayo Saka', position: 'Attacker', shirtNumber: 7 },
  team: { id: 57, name: 'Arsenal FC' },
  playedMatches: 10,
  goals: 5,
  assists: 3,
  penalties: 1,
};

function stubEquipos(): void {
  vi.spyOn(TestBed.inject(EquipoService), 'listar').mockReturnValue(of([]));
}

/** Stub listarCompeticiones to return a fixed list (defaults to empty). */
function stubListarCompeticiones(comps: FdCompeticion[] = []): void {
  vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
    .mockReturnValue(of(comps));
}

/**
 * Stubs all FD service calls needed by confirmarEquipoApi().
 * Pass overrides to change individual stubs.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stubConfirmar(overrides: {
  crear?:      Observable<any>;
  plantilla?:  Observable<any>;
  partidos?:   Observable<any>;
  goleadores?: Observable<any>;
} = {}): void {
  vi.spyOn(TestBed.inject(EquipoService), 'crear')
    .mockReturnValue(overrides.crear ?? of(EQUIPO_CREADO_MOCK));
  vi.spyOn(TestBed.inject(FootballDataService), 'listarPlantillaEquipo')
    .mockReturnValue(overrides.plantilla ?? of(SQUAD_MOCK));
  vi.spyOn(TestBed.inject(FootballDataService), 'listarPartidosEquipo')
    .mockReturnValue(overrides.partidos ?? of([MATCH_MOCK]));
  vi.spyOn(TestBed.inject(FootballDataService), 'listarGoleadores')
    .mockReturnValue(overrides.goleadores ?? of([GOLEADOR_MOCK]));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('LigaPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [LigaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        EquipoService,
        EquipoActivoService,
        FootballDataService,
        JugadorService,
      ],
    }).compileComponents();
  });

  // ── Smoke ──────────────────────────────────────────────────────────────────
  it('should create', () => {
    stubEquipos();
    stubListarCompeticiones();
    expect(TestBed.createComponent(LigaPageComponent).componentInstance).toBeTruthy();
  });

  // ── abrirPanel('api') ──────────────────────────────────────────────────────
  describe('abrirPanel("api")', () => {
    it('immediately triggers listarCompeticiones on open', () => {
      stubEquipos();
      const spy = vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([COMP_MOCK]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');

      expect(spy).toHaveBeenCalledOnce();
    });

    it('populates competiciones and sets apiPaso to "ligas" on successful open', () => {
      stubEquipos();
      stubListarCompeticiones([COMP_MOCK]);

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');

      expect(comp.competiciones.length).toBe(1);
      expect(comp.apiPaso).toBe('ligas');
    });

    it('clears competiciones, equiposApi, and selection', () => {
      stubEquipos();
      stubListarCompeticiones();

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competiciones = [COMP_MOCK];
      comp.competicionSeleccionada = COMP_MOCK;

      comp.abrirPanel('api');

      // After open, competiciones will be empty (stubbed to return [])
      expect(comp.competiciones.length).toBe(0);
      expect(comp.competicionSeleccionada).toBeNull();
    });

    it('resets mostrarAvanzado to false', () => {
      stubEquipos();
      stubListarCompeticiones();

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.mostrarAvanzado = true;

      comp.abrirPanel('api');

      expect(comp.mostrarAvanzado).toBe(false);
    });

    it('toggles panel closed when clicked a second time', () => {
      stubEquipos();
      stubListarCompeticiones();

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');
      expect(comp.panelAbierto).toBe('api');

      comp.abrirPanel('api');
      expect(comp.panelAbierto).toBe('ninguno');
    });

    it('shows error and stays on "ligas" when listarCompeticiones fails on open', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(throwError(() => new Error('No hay API key configurada.')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');

      expect(comp.error).toBeTruthy();
      expect(comp.apiPaso).toBe('ligas');
      expect(comp.guardando).toBe(false);
    });
  });

  // ── cerrarPanel() ──────────────────────────────────────────────────────────
  describe('cerrarPanel()', () => {
    it('closes the panel', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.panelAbierto = 'api';

      comp.cerrarPanel();

      expect(comp.panelAbierto).toBe('ninguno');
    });

    it('clears any displayed error', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.error = 'some error';

      comp.cerrarPanel();

      expect(comp.error).toBeNull();
    });

    it('resets mostrarAvanzado to false', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.mostrarAvanzado = true;

      comp.cerrarPanel();

      expect(comp.mostrarAvanzado).toBe(false);
    });
  });

  // ── cargarCompeticiones() ──────────────────────────────────────────────────
  describe('cargarCompeticiones()', () => {
    it('advances apiPaso to "ligas" and populates competiciones on success', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([COMP_MOCK]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.cargarCompeticiones();

      expect(comp.apiPaso).toBe('ligas');
      expect(comp.competiciones.length).toBe(1);
      expect(comp.guardando).toBe(false);
    });

    it('sets error and clears guardando on service failure', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(throwError(() => new Error('403: API key inválida')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.cargarCompeticiones();

      expect(comp.error).toContain('403');
      expect(comp.guardando).toBe(false);
    });

    it('resets competiciones before each call (so stale data never persists)', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competiciones = [COMP_MOCK];   // stale data

      comp.cargarCompeticiones();

      expect(comp.competiciones.length).toBe(0);
    });
  });

  // ── advanced URL config ────────────────────────────────────────────────────
  describe('advanced URL config', () => {
    it('apiBaseActual returns the service base URL', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      fdSvc.setApiBase('https://my-proxy.example.com/v4');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.apiBaseActual).toBe('https://my-proxy.example.com/v4');
    });

    it('abrirPanel("api") loads apiBaseInput from service', () => {
      stubEquipos();
      stubListarCompeticiones();
      TestBed.inject(FootballDataService).setApiBase('https://custom.example.com/v4');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'stale-value';

      comp.abrirPanel('api');

      expect(comp.apiBaseInput).toBe('https://custom.example.com/v4');
    });

    it('abrirPanel("api") resets mostrarAvanzado to false', () => {
      stubEquipos();
      stubListarCompeticiones();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.mostrarAvanzado = true;

      comp.abrirPanel('api');

      expect(comp.mostrarAvanzado).toBe(false);
    });

    it('cerrarPanel() resets mostrarAvanzado to false', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.mostrarAvanzado = true;

      comp.cerrarPanel();

      expect(comp.mostrarAvanzado).toBe(false);
    });

    it('guardarApiBase() persists the input value via fdService', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      const spy = vi.spyOn(fdSvc, 'setApiBase');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'https://prod-proxy.example.com/v4';

      comp.guardarApiBase();

      expect(spy).toHaveBeenCalledWith('https://prod-proxy.example.com/v4');
    });

    it('guardarApiBase() re-syncs apiBaseInput to the normalized stored value', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'https://prod-proxy.example.com/v4/';  // trailing slash

      comp.guardarApiBase();

      expect(comp.apiBaseInput).toBe('https://prod-proxy.example.com/v4');
    });

    it('guardarApiBase() shows a success banner', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'https://example.com/v4';

      comp.guardarApiBase();

      expect(comp.exito).toBeTruthy();
    });

    it('resetearApiBase() restores the environment default and syncs apiBaseInput', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      fdSvc.setApiBase('https://custom.example.com/v4');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'https://custom.example.com/v4';

      comp.resetearApiBase();

      expect(comp.apiBaseInput).toBe('/api/fd');
      expect(fdSvc.getApiBase()).toBe('/api/fd');
    });
  });

  // ── confirmarEquipoApi() ───────────────────────────────────────────────────
  describe('confirmarEquipoApi()', () => {
    it('does nothing when no team is selected', () => {
      stubEquipos();
      stubListarCompeticiones();
      const crearSpy = vi.spyOn(TestBed.inject(EquipoService), 'crear');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = null;
      comp.confirmarEquipoApi();

      expect(crearSpy).not.toHaveBeenCalled();
    });

    it('closes the panel and shows success message on full import', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.panelAbierto).toBe('ninguno');
      expect(comp.guardando).toBe(false);
      expect(comp.exito).toBeTruthy();
    });

    it('bulk-imports squad players via JugadorService.importarPlantilla()', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(importSpy).toHaveBeenCalledOnce();
      const [equipoId, jugadores] = importSpy.mock.calls[0];
      expect(equipoId).toBe(EQUIPO_CREADO_MOCK.id);
      expect(jugadores).toHaveLength(SQUAD_MOCK.length);
      // Position mapping + separación nombre/apellidos desde el nombre completo de la API
      expect(jugadores[0]).toMatchObject({ nombre: 'Bukayo',  apellidos: 'Saka',   posicion: 'Delantero', dorsal: 7  });
      expect(jugadores[1]).toMatchObject({ nombre: 'David',   apellidos: 'Raya',   posicion: 'Portero',   dorsal: 22 });
      expect(jugadores[2]).toMatchObject({ nombre: 'William', apellidos: 'Saliba', posicion: 'Defensa',   dorsal: 12 });
    });

    it('still succeeds and closes panel when squad API fails', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({
        plantilla: throwError(() => new Error('429: rate limit')),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.panelAbierto).toBe('ninguno');
      expect(comp.guardando).toBe(false);
      expect(comp.error).toBeNull();
    });

    it('still succeeds and closes panel when matches API fails', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({
        partidos: throwError(() => new Error('429: rate limit')),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.panelAbierto).toBe('ninguno');
      expect(comp.guardando).toBe(false);
      expect(comp.error).toBeNull();
    });

    it('shows error and keeps panel open when team creation fails', () => {
      stubEquipos();
      stubListarCompeticiones();
      vi.spyOn(TestBed.inject(EquipoService), 'crear')
        .mockReturnValue(throwError(() => new Error('Error de red')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.panelAbierto = 'api';

      comp.confirmarEquipoApi();

      expect(comp.error).toContain('Error de red');
      expect(comp.guardando).toBe(false);
      expect(comp.panelAbierto).toBe('api');
    });

    it('skips importarPlantilla when squad is empty', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({ plantilla: of([]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(importSpy).not.toHaveBeenCalled();
    });

    it('passes competicion id to listarPartidosEquipo to filter by league', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();
      const partidosSpy = vi.spyOn(TestBed.inject(FootballDataService), 'listarPartidosEquipo')
        .mockReturnValue(of([MATCH_MOCK]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;   // id = 2021

      comp.confirmarEquipoApi();

      // Third argument must be the competition id
      expect(partidosSpy).toHaveBeenCalledWith(FD_EQUIPO_MOCK.id, 10, COMP_MOCK.id);
    });

    it('merges scorer stats into squad payloads when goleadores are available', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({ goleadores: of([GOLEADOR_MOCK]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      const jugadores = importSpy.mock.calls[0][1];
      // GOLEADOR_MOCK maps player.id=1 (Bukayo Saka) → goals=5, assists=3
      const saka = jugadores.find(
        (j: { nombre: string; apellidos?: string }) => j.nombre === 'Bukayo' && j.apellidos === 'Saka',
      );
      expect(saka).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(saka!.goles).toBe(5);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(saka!.asistencias).toBe(3);
    });

    it('still succeeds and closes panel when goleadores API fails', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({
        goleadores: throwError(() => new Error('429: rate limit')),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.panelAbierto).toBe('ninguno');
      expect(comp.guardando).toBe(false);
      expect(comp.error).toBeNull();
    });

    it('sets goles and asistencias to 0 for players not in scorers list', () => {
      stubEquipos();
      stubListarCompeticiones();
      // goleadores list is empty → no stats for any player
      stubConfirmar({ goleadores: of([]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      const jugadores = importSpy.mock.calls[0][1];
      for (const j of jugadores) {
        expect(j.goles).toBe(0);
        expect(j.asistencias).toBe(0);
      }
    });
  });

  // ── season calculation ────────────────────────────────────────────────────
  describe('season calculation', () => {
    it('confirmarEquipoApi() uses getCurrentSeason() — not raw year+1', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();
      const crearSpy = vi.spyOn(TestBed.inject(EquipoService), 'crear')
        .mockReturnValue(of(EQUIPO_CREADO_MOCK));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      const payload = crearSpy.mock.calls[0][0];
      // Must match "YYYY/YYYY" format and be a valid football season
      expect(payload.temporada).toMatch(/^\d{4}\/\d{4}$/);
      const [start, end] = payload.temporada!.split('/').map(Number);
      expect(end - start).toBe(1);
    });
  });

  // ── mapFdPosicion (position mapping) ─────────────────────────────────────
  describe('position mapping via importarPlantilla', () => {
    function buildSquad(positions: (string | null)[]): FdJugadorSquad[] {
      return positions.map((pos, i) => ({
        id: i + 1,
        name: `Player ${i + 1}`,
        position: pos,
        shirtNumber: i + 1,
      }));
    }

    it('maps all four standard API positions correctly', () => {
      stubEquipos();
      stubListarCompeticiones();
      const squad = buildSquad(['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']);
      stubConfirmar({ plantilla: of(squad), goleadores: of([]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.confirmarEquipoApi();

      const posiciones = importSpy.mock.calls[0][1].map((j: { posicion: string }) => j.posicion);
      expect(posiciones).toEqual(['Portero', 'Defensa', 'Centrocampista', 'Delantero']);
    });

    it('maps null position to Centrocampista (fallback)', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({ plantilla: of(buildSquad([null])), goleadores: of([]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.confirmarEquipoApi();

      expect(importSpy.mock.calls[0][1][0].posicion).toBe('Centrocampista');
    });

    it('maps unexpected keyword values via fallback logic', () => {
      stubEquipos();
      stubListarCompeticiones();
      const squad = buildSquad(['Centre-Back', 'Centre-Forward', 'Left Winger']);
      stubConfirmar({ plantilla: of(squad), goleadores: of([]) });
      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.confirmarEquipoApi();

      const posiciones = importSpy.mock.calls[0][1].map((j: { posicion: string }) => j.posicion);
      expect(posiciones[0]).toBe('Defensa');    // 'Centre-Back' → back → Defensa
      expect(posiciones[1]).toBe('Delantero');  // 'Centre-Forward' → forward → Delantero
      expect(posiciones[2]).toBe('Delantero');  // 'Left Winger' → winger → Delantero
    });
  });

  // ── loadingMsg ────────────────────────────────────────────────────────────
  describe('loadingMsg', () => {
    it('cargarCompeticiones sets a "ligas" loading message', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([]));
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;

      comp.cargarCompeticiones();

      expect(comp.loadingMsg.toLowerCase()).toContain('ligas');
    });

    it('seleccionarCompeticion sets a message that includes the competition name', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarEquipos')
        .mockReturnValue(of([]));
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;

      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.loadingMsg).toContain(COMP_MOCK.name);
    });

    it('confirmarEquipoApi sets an "importando" loading message', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.loadingMsg.toLowerCase()).toContain('importando');
    });
  });

  // ── request cancellation ───────────────────────────────────────────────────
  describe('request cancellation', () => {
    it('cerrarPanel() sets guardando to false even when a request is in-flight', () => {
      stubEquipos();
      const pending$ = new Subject<typeof COMP_MOCK[]>();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(pending$.asObservable());

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');
      expect(comp.guardando).toBe(true); // still in-flight

      comp.cerrarPanel();
      expect(comp.guardando).toBe(false);   // cleared immediately
      expect(comp.panelAbierto).toBe('ninguno');

      // Late server response should not update component state
      pending$.next([COMP_MOCK]);
      expect(comp.competiciones.length).toBe(0);
    });

    it('toggling the same panel cancels the in-flight request and clears guardando', () => {
      stubEquipos();
      const pending$ = new Subject<typeof COMP_MOCK[]>();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(pending$.asObservable());

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');         // open → starts loading
      expect(comp.guardando).toBe(true);

      comp.abrirPanel('api');         // toggle close
      expect(comp.panelAbierto).toBe('ninguno');
      expect(comp.guardando).toBe(false);

      // Stale response after toggle should be ignored
      pending$.next([COMP_MOCK]);
      expect(comp.competiciones.length).toBe(0);
    });

    it('re-opening panel after close starts a fresh request (previous cancellation does not block new sub)', () => {
      stubEquipos();
      let callCount = 0;
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockImplementation(() => { callCount++; return of([COMP_MOCK]); });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');   // 1st open
      comp.abrirPanel('api');   // toggle close
      comp.abrirPanel('api');   // 2nd open

      expect(comp.panelAbierto).toBe('api');
      expect(callCount).toBe(2);         // called on 1st and 2nd open
      expect(comp.competiciones.length).toBe(1); // populated from 2nd request
    });
  });

  // ── seleccionarCompeticion() ───────────────────────────────────────────────
  describe('seleccionarCompeticion()', () => {
    it('advances to "equipos" and populates equiposApi on success', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarEquipos')
        .mockReturnValue(of([{ id: 57, name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS', area: { name: 'England' } }]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiPaso = 'ligas';

      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.apiPaso).toBe('equipos');
      expect(comp.equiposApi.length).toBe(1);
    });

    it('shows error and stays on "ligas" when listarEquipos fails', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarEquipos')
        .mockReturnValue(throwError(() => new Error('429: Límite de peticiones.')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiPaso = 'ligas';

      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.error).toContain('429');
      expect(comp.apiPaso).toBe('ligas');
    });

    it('shows error when key is not configured (environment empty)', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarEquipos')
        .mockReturnValue(throwError(() => new Error('La API key no está disponible.')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.error).toBeTruthy();
      // No 'key' step to go back to — component stays on 'ligas'
      expect(comp.apiPaso).toBe('ligas');
    });
  });

  // ── agregarStatsDePartidos() ──────────────────────────────────────────────
  describe('agregarStatsDePartidos()', () => {
    const TEAM_ID = 57;

    function makeMatch(overrides: Partial<FdMatch> = {}): FdMatch {
      return {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        competition: { id: 2021, code: 'PL', name: 'Premier League' },
        homeTeam: { id: TEAM_ID, name: 'Arsenal FC' },
        awayTeam: { id: 64,      name: 'Liverpool FC' },
        score: { fullTime: { home: 1, away: 0 } },
        ...overrides,
      };
    }

    it('returns empty map for matches with no bookings or lineups', () => {
      const result = agregarStatsDePartidos([makeMatch()], TEAM_ID);
      expect(result.size).toBe(0);
    });

    it('counts a yellow card for the correct player', () => {
      const booking: FdBooking = {
        minute: 30,
        team:   { id: TEAM_ID, name: 'Arsenal FC' },
        player: { id: 10, name: 'Player A' },
        card:   'YELLOW',
      };
      const result = agregarStatsDePartidos([makeMatch({ bookings: [booking] })], TEAM_ID);
      expect(result.get(10)?.amarillas).toBe(1);
      expect(result.get(10)?.rojas).toBe(0);
    });

    it('counts a RED card as a red card', () => {
      const booking: FdBooking = {
        minute: 55,
        team:   { id: TEAM_ID, name: 'Arsenal FC' },
        player: { id: 10, name: 'Player A' },
        card:   'RED',
      };
      const result = agregarStatsDePartidos([makeMatch({ bookings: [booking] })], TEAM_ID);
      expect(result.get(10)?.rojas).toBe(1);
      expect(result.get(10)?.amarillas).toBe(0);
    });

    it('counts a YELLOW_RED card as a red card', () => {
      const booking: FdBooking = {
        minute: 70,
        team:   { id: TEAM_ID, name: 'Arsenal FC' },
        player: { id: 10, name: 'Player A' },
        card:   'YELLOW_RED',
      };
      const result = agregarStatsDePartidos([makeMatch({ bookings: [booking] })], TEAM_ID);
      expect(result.get(10)?.rojas).toBe(1);
      expect(result.get(10)?.amarillas).toBe(0);
    });

    it('ignores bookings from the opposing team', () => {
      const opponentBooking: FdBooking = {
        minute: 20,
        team:   { id: 64, name: 'Liverpool FC' },
        player: { id: 99, name: 'Opponent Player' },
        card:   'YELLOW',
      };
      const result = agregarStatsDePartidos([makeMatch({ bookings: [opponentBooking] })], TEAM_ID);
      expect(result.has(99)).toBe(false);
    });

    it('accumulates cards across multiple matches', () => {
      const booking: FdBooking = {
        minute: 30,
        team:   { id: TEAM_ID, name: 'Arsenal FC' },
        player: { id: 10, name: 'Player A' },
        card:   'YELLOW',
      };
      const match1 = makeMatch({ id: 1, bookings: [booking] });
      const match2 = makeMatch({ id: 2, bookings: [booking] });
      const result = agregarStatsDePartidos([match1, match2], TEAM_ID);
      expect(result.get(10)?.amarillas).toBe(2);
    });

    it('gives 90 minutes to a starter who played the full game (home team)', () => {
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const match = makeMatch({
        homeTeam: { id: TEAM_ID, name: 'Arsenal FC', lineup },
      });
      const result = agregarStatsDePartidos([match], TEAM_ID);
      expect(result.get(10)?.minutos).toBe(90);
    });

    it('gives 90 minutes to a starter who played the full game (away team)', () => {
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const match = makeMatch({
        homeTeam: { id: 64, name: 'Liverpool FC' },
        awayTeam: { id: TEAM_ID, name: 'Arsenal FC', lineup },
      });
      const result = agregarStatsDePartidos([match], TEAM_ID);
      expect(result.get(10)?.minutos).toBe(90);
    });

    it('gives the sub-off minute to a starter who was substituted out', () => {
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const sub: FdSubstitution = {
        minute:    65,
        team:      { id: TEAM_ID, name: 'Arsenal FC' },
        playerOut: { id: 10, name: 'Player A' },
        playerIn:  { id: 20, name: 'Player B' },
      };
      const match = makeMatch({
        homeTeam:      { id: TEAM_ID, name: 'Arsenal FC', lineup },
        substitutions: [sub],
      });
      const result = agregarStatsDePartidos([match], TEAM_ID);
      expect(result.get(10)?.minutos).toBe(65);
    });

    it('gives 90 - sub-on minute to a player who came off the bench', () => {
      const sub: FdSubstitution = {
        minute:    65,
        team:      { id: TEAM_ID, name: 'Arsenal FC' },
        playerOut: { id: 10, name: 'Player A' },
        playerIn:  { id: 20, name: 'Player B' },
      };
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const match = makeMatch({
        homeTeam:      { id: TEAM_ID, name: 'Arsenal FC', lineup },
        substitutions: [sub],
      });
      const result = agregarStatsDePartidos([match], TEAM_ID);
      expect(result.get(20)?.minutos).toBe(25); // 90 - 65
    });

    it('accumulates minutes across multiple matches', () => {
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const match1 = makeMatch({ id: 1, homeTeam: { id: TEAM_ID, name: 'Arsenal FC', lineup } });
      const match2 = makeMatch({ id: 2, homeTeam: { id: TEAM_ID, name: 'Arsenal FC', lineup } });
      const result = agregarStatsDePartidos([match1, match2], TEAM_ID);
      expect(result.get(10)?.minutos).toBe(180); // 90 + 90
    });

    it('ignores substitutions from the opposing team for minute calculation', () => {
      const opponentSub: FdSubstitution = {
        minute:    45,
        team:      { id: 64, name: 'Liverpool FC' },
        playerOut: { id: 99, name: 'Opp Out' },
        playerIn:  { id: 88, name: 'Opp In' },
      };
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const match = makeMatch({
        homeTeam:      { id: TEAM_ID, name: 'Arsenal FC', lineup },
        substitutions: [opponentSub],
      });
      const result = agregarStatsDePartidos([match], TEAM_ID);
      // Player 10 started and was not subbed out → 90 min
      expect(result.get(10)?.minutos).toBe(90);
      // Opponent players should not appear in the map
      expect(result.has(99)).toBe(false);
      expect(result.has(88)).toBe(false);
    });

    it('handles missing bookings and substitutions arrays gracefully', () => {
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Attacker', shirtNumber: 9 },
      ];
      // No bookings, no substitutions fields at all
      const match: FdMatch = {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        competition: { id: 2021, code: 'PL', name: 'Premier League' },
        homeTeam: { id: TEAM_ID, name: 'Arsenal FC', lineup },
        awayTeam: { id: 64, name: 'Liverpool FC' },
        score: { fullTime: { home: 1, away: 0 } },
      };
      expect(() => agregarStatsDePartidos([match], TEAM_ID)).not.toThrow();
      const result = agregarStatsDePartidos([match], TEAM_ID);
      expect(result.get(10)?.minutos).toBe(90);
    });
  });

  // ── confirmarEquipoApi() — tarjetas y minutos desde partidos ──────────────
  describe('confirmarEquipoApi() — tarjetas y minutos desde partidos', () => {
    it('populates tarjetasAmarillas from match bookings', () => {
      stubEquipos();

      const squadWithPlayer: FdJugadorSquad[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const booking: FdBooking = {
        minute: 30,
        team:   { id: FD_EQUIPO_MOCK.id, name: FD_EQUIPO_MOCK.name },
        player: { id: 10, name: 'Player A' },
        card:   'YELLOW',
      };
      const matchWithBooking: FdMatch = {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        competition: { id: 2021, code: 'PL', name: 'Premier League' },
        homeTeam: { id: FD_EQUIPO_MOCK.id, name: FD_EQUIPO_MOCK.name },
        awayTeam: { id: 64, name: 'Liverpool FC' },
        score: { fullTime: { home: 1, away: 0 } },
        bookings: [booking],
      };

      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla')
        .mockReturnValue([]);

      stubConfirmar({
        plantilla:  of(squadWithPlayer),
        partidos:   of([matchWithBooking]),
        goleadores: of([]),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;

      comp.confirmarEquipoApi();

      expect(importSpy).toHaveBeenCalledOnce();
      const payloads = importSpy.mock.calls[0][1];
      const playerPayload = payloads.find((p) => p.nombre === 'Player' && p.apellidos === 'A');
      expect(playerPayload?.tarjetasAmarillas).toBe(1);
      expect(playerPayload?.tarjetasRojas).toBe(0);
    });

    it('populates tarjetasRojas from YELLOW_RED bookings', () => {
      stubEquipos();

      const squadWithPlayer: FdJugadorSquad[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const booking: FdBooking = {
        minute: 70,
        team:   { id: FD_EQUIPO_MOCK.id, name: FD_EQUIPO_MOCK.name },
        player: { id: 10, name: 'Player A' },
        card:   'YELLOW_RED',
      };
      const matchWithBooking: FdMatch = {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        competition: { id: 2021, code: 'PL', name: 'Premier League' },
        homeTeam: { id: FD_EQUIPO_MOCK.id, name: FD_EQUIPO_MOCK.name },
        awayTeam: { id: 64, name: 'Liverpool FC' },
        score: { fullTime: { home: 1, away: 0 } },
        bookings: [booking],
      };

      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla')
        .mockReturnValue([]);

      stubConfirmar({
        plantilla:  of(squadWithPlayer),
        partidos:   of([matchWithBooking]),
        goleadores: of([]),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;

      comp.confirmarEquipoApi();

      const payloads = importSpy.mock.calls[0][1];
      const playerPayload = payloads.find((p) => p.nombre === 'Player' && p.apellidos === 'A');
      expect(playerPayload?.tarjetasRojas).toBe(1);
    });

    it('populates minutos from lineup data', () => {
      stubEquipos();

      const squadWithPlayer: FdJugadorSquad[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const lineup: FdLineupPlayer[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];
      const matchWithLineup: FdMatch = {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        competition: { id: 2021, code: 'PL', name: 'Premier League' },
        homeTeam: { id: FD_EQUIPO_MOCK.id, name: FD_EQUIPO_MOCK.name, lineup },
        awayTeam: { id: 64, name: 'Liverpool FC' },
        score: { fullTime: { home: 1, away: 0 } },
      };

      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla')
        .mockReturnValue([]);

      stubConfirmar({
        plantilla:  of(squadWithPlayer),
        partidos:   of([matchWithLineup]),
        goleadores: of([]),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;

      comp.confirmarEquipoApi();

      const payloads = importSpy.mock.calls[0][1];
      const playerPayload = payloads.find((p) => p.nombre === 'Player' && p.apellidos === 'A');
      expect(playerPayload?.minutos).toBe(90);
    });

    it('gives 0 tarjetas and 0 minutos to players with no match data', () => {
      stubEquipos();

      const squadWithPlayer: FdJugadorSquad[] = [
        { id: 10, name: 'Player A', position: 'Midfielder', shirtNumber: 8 },
      ];

      const importSpy = vi.spyOn(TestBed.inject(JugadorService), 'importarPlantilla')
        .mockReturnValue([]);

      stubConfirmar({
        plantilla:  of(squadWithPlayer),
        partidos:   of([]),  // no matches at all
        goleadores: of([]),
      });

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competicionSeleccionada = COMP_MOCK;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;

      comp.confirmarEquipoApi();

      const payloads = importSpy.mock.calls[0][1];
      const playerPayload = payloads.find((p) => p.nombre === 'Player' && p.apellidos === 'A');
      expect(playerPayload?.tarjetasAmarillas).toBe(0);
      expect(playerPayload?.tarjetasRojas).toBe(0);
      expect(playerPayload?.minutos).toBe(0);
    });
  });
});
