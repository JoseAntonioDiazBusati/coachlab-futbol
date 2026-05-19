import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { Observable, of, throwError } from 'rxjs';
import { LigaPageComponent } from './liga-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { JugadorService } from '../../services/jugador.service';
import { PartidoService } from '../../services/partido.service';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
  FdJugadorSquad,
  FdMatch,
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
  homeTeam: { id: 57, name: 'Arsenal FC',   shortName: 'Arsenal'   },
  awayTeam: { id: 64, name: 'Liverpool FC', shortName: 'Liverpool' },
  score: { fullTime: { home: 2, away: 1 } },
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
  crear?:    Observable<any>;
  plantilla?: Observable<any>;
  partidos?:  Observable<any>;
} = {}): void {
  vi.spyOn(TestBed.inject(EquipoService), 'crear')
    .mockReturnValue(overrides.crear ?? of(EQUIPO_CREADO_MOCK));
  vi.spyOn(TestBed.inject(FootballDataService), 'listarPlantillaEquipo')
    .mockReturnValue(overrides.plantilla ?? of(SQUAD_MOCK));
  vi.spyOn(TestBed.inject(FootballDataService), 'listarPartidosEquipo')
    .mockReturnValue(overrides.partidos ?? of([MATCH_MOCK]));
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
        PartidoService,
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

      expect(comp.apiBaseInput).toBe('/fd-api/v4');
      expect(fdSvc.getApiBase()).toBe('/fd-api/v4');
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
      // Position mapping
      expect(jugadores[0]).toMatchObject({ nombre: 'Bukayo Saka',    posicion: 'Delantero',      dorsal: 7  });
      expect(jugadores[1]).toMatchObject({ nombre: 'David Raya',     posicion: 'Portero',         dorsal: 22 });
      expect(jugadores[2]).toMatchObject({ nombre: 'William Saliba', posicion: 'Defensa',         dorsal: 12 });
    });

    it('persists imported matches via PartidoService.guardar()', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar();
      const guardarSpy = vi.spyOn(TestBed.inject(PartidoService), 'guardar');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(guardarSpy).toHaveBeenCalledOnce();
      const [equipoId, partidos] = guardarSpy.mock.calls[0];
      expect(equipoId).toBe(EQUIPO_CREADO_MOCK.id);
      expect(partidos).toHaveLength(1);
      // Arsenal was home (id 57) → 2-1 win
      expect(partidos[0]).toMatchObject({
        rival:         'Liverpool',
        fecha:         '2024-03-15',
        esLocal:       true,
        golesNuestros: 2,
        golesRivales:  1,
        resultado:     'VICTORIA',
      });
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
      const guardarSpy = vi.spyOn(TestBed.inject(PartidoService), 'guardar');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(comp.panelAbierto).toBe('ninguno');
      expect(guardarSpy).not.toHaveBeenCalled();
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

    it('skips guardar when matches list is empty', () => {
      stubEquipos();
      stubListarCompeticiones();
      stubConfirmar({ partidos: of([]) });
      const guardarSpy = vi.spyOn(TestBed.inject(PartidoService), 'guardar');

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.equipoApiSeleccionado = FD_EQUIPO_MOCK;
      comp.competicionSeleccionada = COMP_MOCK;

      comp.confirmarEquipoApi();

      expect(guardarSpy).not.toHaveBeenCalled();
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
});
