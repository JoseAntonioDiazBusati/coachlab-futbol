import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { PrepartidoPageComponent } from './prepartido-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';

const mockJugador = (id: number, posicion = 'Delantero', impacto = 2): PlantillaJugador => ({
  jugadorId: id, nombre: 'Jugador', posicion,
  goles: 3, asistencias: 1, minutos: 600,
  tarjetasAmarillas: 1, tarjetasRojas: 0, impacto,
});

const EQUIPO_MOCK: Equipo = { id: 1, nombre: 'CD Test' };

describe('PrepartidoPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [PrepartidoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        EquipoService,
        EquipoActivoService,
        JugadorService,
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PrepartidoPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should initialise 11 slots for 4-3-3', () => {
    const fixture = TestBed.createComponent(PrepartidoPageComponent);
    const comp = fixture.componentInstance;
    comp.inicializarSlots();
    expect(comp.slots.length).toBe(11);
  });

  it('should have 0 players on field initially', () => {
    const fixture = TestBed.createComponent(PrepartidoPageComponent);
    const comp = fixture.componentInstance;
    comp.inicializarSlots();
    expect(comp.totalEnCampo).toBe(0);
  });

  it('getDinamica should return a value between 0 and 10', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    const d = comp.getDinamica(mockJugador(1, 'Delantero', 2.1));
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(10);
  });

  it('getUltimos5 should return 5 ratings all in range 3–10', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    const ratings = comp.getUltimos5(mockJugador(1));
    expect(ratings.length).toBe(5);
    ratings.forEach(r => {
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(10);
    });
  });

  it('probabilidades should sum to 100', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    const p = comp.probabilidades;
    expect(p.victoria + p.empate + p.derrota).toBe(100);
  });

  it('probabilidades with players should sum to 100', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    comp.slots.forEach((s, i) => { s.jugador = mockJugador(i + 1); });
    const p = comp.probabilidades;
    expect(p.victoria + p.empate + p.derrota).toBe(100);
  });

  it('clickSlot should place selected player in empty slot', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    const j = mockJugador(99);
    comp.jugadorSeleccionado = j;
    comp.clickSlot(comp.slots[0]);
    expect(comp.slots[0].jugador?.jugadorId).toBe(99);
    expect(comp.jugadorSeleccionado).toBeNull();
  });

  it('clickSlot on occupied slot should unplace player to selection', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    const j = mockJugador(7);
    comp.slots[0].jugador = j;
    comp.clickSlot(comp.slots[0]);
    expect(comp.slots[0].jugador).toBeNull();
    expect(comp.jugadorSeleccionado?.jugadorId).toBe(7);
  });

  it('limpiarCampo should remove all players', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    comp.slots.forEach((s, i) => { s.jugador = mockJugador(i + 1); });
    comp.limpiarCampo();
    expect(comp.totalEnCampo).toBe(0);
  });

  it('cambiarFormacion should keep the same players', () => {
    const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
    comp.inicializarSlots();
    comp.slots[0].jugador = mockJugador(1);
    comp.slots[1].jugador = mockJugador(2);
    comp.formacion = '4-4-2';
    comp.cambiarFormacion();
    expect(comp.slots.length).toBe(11);
    expect(comp.slots[0].jugador?.jugadorId).toBe(1);
    expect(comp.slots[1].jugador?.jugadorId).toBe(2);
  });

  // ── sinJugadores getter ──────────────────────────────────────────────────
  describe('sinJugadores getter', () => {
    it('returns false while still loading', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargando = true;
      comp.equipo = EQUIPO_MOCK;
      comp.jugadores = [];
      expect(comp.sinJugadores).toBe(false);
    });

    it('returns false when there is no team', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargando = false;
      comp.equipo = null;
      comp.jugadores = [];
      expect(comp.sinJugadores).toBe(false);
    });

    it('returns false when there is an error', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargando = false;
      comp.equipo = EQUIPO_MOCK;
      comp.jugadores = [];
      comp.error = 'Fallo de red';
      expect(comp.sinJugadores).toBe(false);
    });

    it('returns true when team exists but squad is empty and load succeeded', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargando = false;
      comp.error = null;
      comp.equipo = EQUIPO_MOCK;
      comp.jugadores = [];
      expect(comp.sinJugadores).toBe(true);
    });

    it('returns false when team has players', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargando = false;
      comp.error = null;
      comp.equipo = EQUIPO_MOCK;
      comp.jugadores = [mockJugador(1)];
      expect(comp.sinJugadores).toBe(false);
    });
  });

  // ── Error state after failed load ────────────────────────────────────────
  describe('error state', () => {
    it('sets error and stops loading when cargarEquipo() service throws', () => {
      const svc = TestBed.inject(EquipoService);
      vi.spyOn(svc, 'listar').mockReturnValue(
        throwError(() => new Error('Fallo de red'))
      );
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargarEquipo();
      expect(comp.error).toBe('Fallo de red');
      expect(comp.cargando).toBe(false);
    });

    it('sets error and stops loading when cargarJugadores() service throws', () => {
      const jugSvc = TestBed.inject(JugadorService);
      vi.spyOn(jugSvc, 'listarPlantilla').mockReturnValue(
        throwError(() => new Error('Error de plantilla'))
      );
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.equipo = EQUIPO_MOCK;
      comp.cargarJugadores();
      expect(comp.error).toBe('Error de plantilla');
      expect(comp.cargando).toBe(false);
    });

    it('clears error on retry (cargarEquipo call)', () => {
      const svc = TestBed.inject(EquipoService);
      // First call throws, second call succeeds with empty list
      vi.spyOn(svc, 'listar')
        .mockReturnValueOnce(throwError(() => new Error('Fallo temporal')))
        .mockReturnValue(of([]));

      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargarEquipo();
      expect(comp.error).toBeTruthy();

      comp.cargarEquipo();          // retry
      expect(comp.error).toBeNull();
    });
  });

  // ── Empty state: no team ─────────────────────────────────────────────────
  describe('empty state — no team', () => {
    it('equipo is null and cargando is false when no teams exist', () => {
      const svc = TestBed.inject(EquipoService);
      vi.spyOn(svc, 'listar').mockReturnValue(of([]));
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.cargarEquipo();
      expect(comp.equipo).toBeNull();
      expect(comp.cargando).toBe(false);
    });

    it('probabilidades returns a safe default with no team and no slots', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      // slots = [], jugadores = [], equipo = null — no initialisation
      const p = comp.probabilidades;
      expect(p.victoria + p.empate + p.derrota).toBe(100);
    });
  });
});
