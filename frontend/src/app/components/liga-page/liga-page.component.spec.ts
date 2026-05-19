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
    expect(TestBed.createComponent(LigaPageComponent).componentInstance).toBeTruthy();
  });

  // ── tieneApiKeyGuardada ────────────────────────────────────────────────────
  describe('tieneApiKeyGuardada', () => {
    it('returns false when no key is stored', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.tieneApiKeyGuardada).toBe(false);
    });

    it('returns true after a key is saved', () => {
      stubEquipos();
      TestBed.inject(FootballDataService).setApiKey('my-key');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.tieneApiKeyGuardada).toBe(true);
    });

    it('returns false after key is removed from localStorage mid-session', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      fdSvc.setApiKey('my-key');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.tieneApiKeyGuardada).toBe(true);

      localStorage.clear();   // simulate external clear
      expect(comp.tieneApiKeyGuardada).toBe(false);
    });
  });

  // ── apiKeyMasked ───────────────────────────────────────────────────────────
  describe('apiKeyMasked', () => {
    it('returns empty string when no key is stored', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.apiKeyMasked).toBe('');
    });

    it('shows first 4 and last 4 characters of a long key', () => {
      stubEquipos();
      TestBed.inject(FootballDataService).setApiKey('abcdefgh12345678');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      const m = comp.apiKeyMasked;
      expect(m.startsWith('abcd')).toBe(true);
      expect(m.endsWith('5678')).toBe(true);
      expect(m).toContain('•');
    });

    it('fully masks a short key', () => {
      stubEquipos();
      TestBed.inject(FootballDataService).setApiKey('ab12');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      expect(comp.apiKeyMasked).toBe('••••');
    });

    it('reflects current localStorage value reactively', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      fdSvc.setApiKey('key-one-long-value');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      const first = comp.apiKeyMasked;

      fdSvc.setApiKey('key-two-different');
      const second = comp.apiKeyMasked;

      expect(first).not.toBe(second);
    });
  });

  // ── abrirPanel('api') ──────────────────────────────────────────────────────
  describe('abrirPanel("api")', () => {
    it('re-reads apiKey from localStorage on every open', () => {
      stubEquipos();
      TestBed.inject(FootballDataService).setApiKey('fresh-key');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = 'stale-in-memory';   // simulate stale value

      comp.abrirPanel('api');

      expect(comp.apiKey).toBe('fresh-key');
    });

    it('clears apiKey when localStorage has no key on open', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = 'old-value';

      comp.abrirPanel('api');

      expect(comp.apiKey).toBe('');
    });

    it('resets cambiarApiKey to false', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.cambiarApiKey = true;

      comp.abrirPanel('api');

      expect(comp.cambiarApiKey).toBe(false);
    });

    it('resets apiPaso to "key"', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiPaso = 'equipos';

      comp.abrirPanel('api');

      expect(comp.apiPaso).toBe('key');
    });

    it('clears competiciones, equiposApi, and selection', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.competiciones = [COMP_MOCK];
      comp.competicionSeleccionada = COMP_MOCK;

      comp.abrirPanel('api');

      expect(comp.competiciones.length).toBe(0);
      expect(comp.competicionSeleccionada).toBeNull();
    });

    it('toggles panel closed when clicked a second time', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.abrirPanel('api');
      expect(comp.panelAbierto).toBe('api');

      comp.abrirPanel('api');
      expect(comp.panelAbierto).toBe('ninguno');
    });
  });

  // ── cerrarPanel() ──────────────────────────────────────────────────────────
  describe('cerrarPanel()', () => {
    it('resets cambiarApiKey to false', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.cambiarApiKey = true;

      comp.cerrarPanel();

      expect(comp.cambiarApiKey).toBe(false);
    });

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
  });

  // ── cargarCompeticiones() ──────────────────────────────────────────────────
  describe('cargarCompeticiones()', () => {
    it('sets error when apiKey is empty', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = '';

      comp.cargarCompeticiones();

      expect(comp.error).toBeTruthy();
    });

    it('sets error when apiKey is whitespace only', () => {
      stubEquipos();
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = '   ';

      comp.cargarCompeticiones();

      expect(comp.error).toBeTruthy();
    });

    it('resets cambiarApiKey after successful call', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = 'valid-key';
      comp.cambiarApiKey = true;

      comp.cargarCompeticiones();

      expect(comp.cambiarApiKey).toBe(false);
    });

    it('advances apiPaso to "ligas" on success', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(of([COMP_MOCK]));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = 'valid-key';

      comp.cargarCompeticiones();

      expect(comp.apiPaso).toBe('ligas');
      expect(comp.competiciones.length).toBe(1);
    });

    it('shows service error message on failure', () => {
      stubEquipos();
      vi.spyOn(TestBed.inject(FootballDataService), 'listarCompeticiones')
        .mockReturnValue(throwError(() => new Error('403: API key inválida')));

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiKey = 'bad-key';

      comp.cargarCompeticiones();

      expect(comp.error).toContain('403');
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
      TestBed.inject(FootballDataService).setApiBase('https://custom.example.com/v4');
      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiBaseInput = 'stale-value';

      comp.abrirPanel('api');

      expect(comp.apiBaseInput).toBe('https://custom.example.com/v4');
    });

    it('abrirPanel("api") resets mostrarAvanzado to false', () => {
      stubEquipos();
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

      // Service strips the slash; component must reflect the normalized value
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

      // localStorage override cleared → falls back to dev environment default
      expect(comp.apiBaseInput).toBe('/fd-api/v4');
      expect(fdSvc.getApiBase()).toBe('/fd-api/v4');
    });
  });

  // ── seleccionarCompeticion() — key lost mid-session ────────────────────────
  describe('seleccionarCompeticion() — key disappears mid-session', () => {
    it('resets apiPaso to "key" and clears apiKey when tieneApiKey() is false', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      vi.spyOn(fdSvc, 'listarEquipos').mockReturnValue(
        throwError(() => new Error('La API key ya no está disponible.'))
      );
      vi.spyOn(fdSvc, 'tieneApiKey').mockReturnValue(false);

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiPaso = 'ligas';
      comp.apiKey = 'was-valid';

      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.apiPaso).toBe('key');
      expect(comp.apiKey).toBe('');
      expect(comp.cambiarApiKey).toBe(false);
    });

    it('keeps apiPaso at "ligas" for a non-key error (rate limit, 404…)', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      vi.spyOn(fdSvc, 'listarEquipos').mockReturnValue(
        throwError(() => new Error('Límite de peticiones alcanzado (429).'))
      );
      vi.spyOn(fdSvc, 'tieneApiKey').mockReturnValue(true); // key still present

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.apiPaso = 'ligas';

      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.apiPaso).toBe('ligas');
    });

    it('shows the error message regardless of which error occurred', () => {
      stubEquipos();
      const fdSvc = TestBed.inject(FootballDataService);
      vi.spyOn(fdSvc, 'listarEquipos').mockReturnValue(
        throwError(() => new Error('La API key ya no está disponible.'))
      );
      vi.spyOn(fdSvc, 'tieneApiKey').mockReturnValue(false);

      const comp = TestBed.createComponent(LigaPageComponent).componentInstance;
      comp.seleccionarCompeticion(COMP_MOCK);

      expect(comp.error).toBeTruthy();
    });
  });
});
