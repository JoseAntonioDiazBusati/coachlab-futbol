import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { PlantillaPageComponent } from './plantilla-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const EQUIPO_MOCK: Equipo = { id: 1, nombre: 'CD Test', categoria: 'Regional' };

const JUGADOR_MOCK: PlantillaJugador = {
  jugadorId: 1,
  nombre: 'Carlos',
  posicion: 'Defensa',
  goles: 0,
  asistencias: 0,
  minutos: 0,
  tarjetasAmarillas: 0,
  tarjetasRojas: 0,
  impacto: 0,
};

const PORTERO_MOCK: PlantillaJugador = {
  jugadorId: 2,
  nombre: 'Diego',
  posicion: 'Portero',
  goles: 0,
  asistencias: 0,
  minutos: 90,
  tarjetasAmarillas: 0,
  tarjetasRojas: 0,
  impacto: 1.5,
  paradasLimpias: 3,
  golesEncajados: 1,
  penaltisParados: 0,
};

function stubEquipoService(): void {
  const svc = TestBed.inject(EquipoService);
  vi.spyOn(svc, 'listar').mockReturnValue(of([EQUIPO_MOCK]));
}

function stubJugadorService(jugadores: PlantillaJugador[] = []): void {
  const svc = TestBed.inject(JugadorService);
  vi.spyOn(svc, 'listarPlantilla').mockReturnValue(of(jugadores));
}

// ─────────────────────────────────────────────────────────────────────────────

describe('PlantillaPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [PlantillaPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        EquipoService,
        EquipoActivoService,
        JugadorService,
      ],
    }).compileComponents();
  });

  // ── Smoke ────────────────────────────────────────────────────────────────
  it('should create', () => {
    stubEquipoService();
    stubJugadorService();
    const fixture = TestBed.createComponent(PlantillaPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  // ── Computed lists ───────────────────────────────────────────────────────
  describe('porteros / jugadoresCampo getters', () => {
    it('porteros returns only players with posicion === "Portero"', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.jugadores = [PORTERO_MOCK, JUGADOR_MOCK];
      expect(comp.porteros.length).toBe(1);
      expect(comp.porteros[0].posicion).toBe('Portero');
    });

    it('jugadoresCampo excludes porteros', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.jugadores = [PORTERO_MOCK, JUGADOR_MOCK];
      expect(comp.jugadoresCampo.length).toBe(1);
      expect(comp.jugadoresCampo[0].posicion).not.toBe('Portero');
    });

    it('a player with empty posicion falls into jugadoresCampo — blocked by validation', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.jugadores = [{ ...JUGADOR_MOCK, posicion: '' }];
      // Without validation, empty-posicion players would silently appear in campo.
      // The service guard + component guard prevent this from ever being persisted.
      expect(comp.porteros.length).toBe(0);
      expect(comp.jugadoresCampo.length).toBe(1);
    });
  });

  // ── Modal open/close ─────────────────────────────────────────────────────
  describe('form lifecycle', () => {
    it('abrirFormularioJugador() sets mostrarFormularioJugador to true', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.abrirFormularioJugador();
      expect(comp.mostrarFormularioJugador).toBe(true);
    });

    it('abrirFormularioJugador() resets posicionInvalida', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.posicionInvalida = true;
      comp.abrirFormularioJugador();
      expect(comp.posicionInvalida).toBe(false);
    });

    it('cerrarFormularioJugador() hides the form and resets posicionInvalida', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.mostrarFormularioJugador = true;
      comp.posicionInvalida = true;
      comp.cerrarFormularioJugador();
      expect(comp.mostrarFormularioJugador).toBe(false);
      expect(comp.posicionInvalida).toBe(false);
    });

    it('onPosicionChange() clears posicionInvalida and error', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.posicionInvalida = true;
      comp.error = 'Selecciona una posición';
      comp.onPosicionChange();
      expect(comp.posicionInvalida).toBe(false);
      expect(comp.error).toBeNull();
    });
  });

  // ── crearJugador() — validation ──────────────────────────────────────────
  describe('crearJugador() validation', () => {
    it('sets error and does NOT call service when posicion is empty', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      const svc = TestBed.inject(JugadorService);
      const spy = vi.spyOn(svc, 'crear');

      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.nuevo.nombre = 'Luis';
      comp.nuevo.posicion = '';
      comp.crearJugador();

      expect(comp.error).toBeTruthy();
      expect(comp.posicionInvalida).toBe(true);
      expect(spy).not.toHaveBeenCalled();
    });

    it('sets error and does NOT call service when nombre is empty', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      const svc = TestBed.inject(JugadorService);
      const spy = vi.spyOn(svc, 'crear');

      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.nuevo.nombre = '';
      comp.nuevo.posicion = 'Defensa';
      comp.crearJugador();

      expect(comp.error).toBeTruthy();
      expect(spy).not.toHaveBeenCalled();
    });

    it('sets posicionInvalida=true specifically when posicion is missing', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.nuevo.nombre = 'Ana';
      comp.nuevo.posicion = '';
      comp.crearJugador();
      expect(comp.posicionInvalida).toBe(true);
    });

    it('does NOT set posicionInvalida when only nombre is missing', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.nuevo.nombre = '';
      comp.nuevo.posicion = 'Portero';
      comp.crearJugador();
      expect(comp.posicionInvalida).toBe(false);
    });

    it('does nothing when no equipo is selected', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      const svc = TestBed.inject(JugadorService);
      const spy = vi.spyOn(svc, 'crear');

      comp.equipoSeleccionado = null;
      comp.nuevo.nombre = 'Luis';
      comp.nuevo.posicion = 'Defensa';
      comp.crearJugador();

      expect(spy).not.toHaveBeenCalled();
    });
  });

  // ── crearJugador() — success path ────────────────────────────────────────
  describe('crearJugador() success', () => {
    it('calls service with correct equipoId and resets posicionInvalida', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      const svc = TestBed.inject(JugadorService);
      vi.spyOn(svc, 'crear').mockReturnValue(of(JUGADOR_MOCK));
      vi.spyOn(svc, 'listarPlantilla').mockReturnValue(of([JUGADOR_MOCK]));

      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.posicionInvalida = true;
      comp.nuevo.nombre = 'Carlos';
      comp.nuevo.posicion = 'Defensa';
      comp.crearJugador();

      expect(svc.crear).toHaveBeenCalledWith(EQUIPO_MOCK.id, expect.objectContaining({ posicion: 'Defensa' }));
      expect(comp.posicionInvalida).toBe(false);
    });
  });

  // ── crearJugador() — service error ───────────────────────────────────────
  describe('crearJugador() service error', () => {
    it('shows service error message when service rejects', () => {
      stubEquipoService();
      stubJugadorService();
      const comp = TestBed.createComponent(PlantillaPageComponent).componentInstance;
      const svc = TestBed.inject(JugadorService);
      vi.spyOn(svc, 'crear').mockReturnValue(
        throwError(() => new Error('La posición del jugador es obligatoria.'))
      );

      comp.equipoSeleccionado = EQUIPO_MOCK;
      comp.nuevo.nombre = 'Test';
      comp.nuevo.posicion = 'Defensa';
      comp.crearJugador();

      expect(comp.error).toContain('posición');
    });
  });
});
