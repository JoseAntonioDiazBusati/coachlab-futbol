import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { LigaPageComponent } from './liga-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService } from '../../services/equipo.service';
import {
  FootballDataService,
  FdCompeticion,
} from '../../services/football-data.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const COMP_MOCK: FdCompeticion = {
  id: 2021,
  code: 'PL',
  name: 'Premier League',
  area: { name: 'England' },
};

function stubEquipos(): void {
  vi.spyOn(TestBed.inject(EquipoService), 'listar').mockReturnValue(of([]));
}

/** Stub listarCompeticiones to return a fixed list (defaults to empty). */
function stubListarCompeticiones(comps: FdCompeticion[] = []): void {
  vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
    .mockReturnValue(of(comps));
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
