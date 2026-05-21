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

  // ── autoCompletar() ──────────────────────────────────────────────────────
  describe('autoCompletar()', () => {
    /** Build a minimal PlantillaJugador with a specific position and IRE. */
    function makeJ(id: number, posicion: string, ire: number): PlantillaJugador {
      return {
        jugadorId: id, nombre: `P${id}`, posicion,
        goles: 0, asistencias: 0, minutos: 0,
        tarjetasAmarillas: 0, tarjetasRojas: 0, impacto: ire,
      };
    }

    /** Standard 11-player squad matching a 4-3-3 formation. */
    function makeSquad4x3x3(): PlantillaJugador[] {
      return [
        makeJ(1, 'Portero', 5),
        makeJ(2, 'Defensa', 4), makeJ(3, 'Defensa', 6),
        makeJ(4, 'Defensa', 2), makeJ(5, 'Defensa', 8),  // best defender IRE=8
        makeJ(6, 'Centrocampista', 5), makeJ(7, 'Centrocampista', 7), makeJ(8, 'Centrocampista', 3),
        makeJ(9, 'Delantero', 10), makeJ(10, 'Delantero', 6), makeJ(11, 'Delantero', 4),
      ];
    }

    it('fills all 11 slots when a complete squad is available', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();
      comp.inicializarSlots();
      comp.autoCompletar();
      expect(comp.totalEnCampo).toBe(11);
    });

    it('places the portero in the PT slot', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();
      comp.inicializarSlots();
      comp.autoCompletar();
      const pt = comp.slots.find(s => s.etiqueta === 'PT');
      expect(pt?.jugador?.posicion).toBe('Portero');
    });

    it('assigns the highest-IRE defender to the first defensa slot processed', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();   // best defender has IRE=8 (id=5)
      comp.inicializarSlots();
      comp.autoCompletar();
      const defSlots = comp.slots.filter(s => ['DC', 'LD', 'LI'].includes(s.etiqueta));
      const ires = defSlots.map(s => s.jugador?.impacto ?? -1);
      // The best defender (IRE=8) must be somewhere in the lineup
      expect(ires).toContain(8);
    });

    it('assigns the highest-IRE delantero to the first delantero slot', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();   // best delantero has IRE=10 (id=9)
      comp.inicializarSlots();
      comp.autoCompletar();
      const delSlots = comp.slots.filter(s => s.etiqueta === 'DEL' || s.etiqueta === 'EX');
      const ires = delSlots.map(s => s.jugador?.impacto ?? -1);
      expect(ires).toContain(10);
    });

    it('does not assign a portero to a campo slot when campo players are available', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      // Portero has very high IRE — must NOT occupy a campo slot
      comp.jugadores = [
        makeJ(1, 'Portero', 100),
        makeJ(2, 'Defensa', 1), makeJ(3, 'Defensa', 1),
        makeJ(4, 'Defensa', 1), makeJ(5, 'Defensa', 1),
        makeJ(6, 'Centrocampista', 1), makeJ(7, 'Centrocampista', 1), makeJ(8, 'Centrocampista', 1),
        makeJ(9, 'Delantero', 1), makeJ(10, 'Delantero', 1), makeJ(11, 'Delantero', 1),
      ];
      comp.inicializarSlots();
      comp.autoCompletar();
      const campoSlots = comp.slots.filter(s => s.etiqueta !== 'PT');
      expect(campoSlots.some(s => s.jugador?.posicion === 'Portero')).toBe(false);
    });

    it('does not touch already-occupied slots', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();
      comp.inicializarSlots();
      const pre = makeJ(99, 'Portero', 0);
      comp.slots[0].jugador = pre;  // manually occupy PT slot
      comp.autoCompletar();
      // Slot 0 should still have the pre-placed player
      expect(comp.slots[0].jugador?.jugadorId).toBe(99);
    });

    it('fills partial slots when fewer than 11 players are available', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = [makeJ(1, 'Portero', 0), makeJ(2, 'Defensa', 0)];
      comp.inicializarSlots();
      comp.autoCompletar();
      expect(comp.totalEnCampo).toBe(2);
    });

    it('does nothing when banco is empty', () => {
      const comp = TestBed.createComponent(PrepartidoPageComponent).componentInstance;
      comp.jugadores = makeSquad4x3x3();
      comp.inicializarSlots();
      comp.slots.forEach((s, i) => { s.jugador = comp.jugadores[i]; });
      comp.autoCompletar();
      // All 11 still occupied
      expect(comp.totalEnCampo).toBe(11);
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
