import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { SetupPageComponent } from './setup-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { FootballDataService } from '../../services/football-data.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns an EquipoService spy that resolves crear() synchronously. */
function mockEquipoCrear(id = 1, nombre = 'CD Test'): void {
  const svc = TestBed.inject(EquipoService);
  vi.spyOn(svc, 'crear').mockReturnValue(of({ id, nombre } as Equipo));
}

/** Returns a JugadorService spy that resolves crear() synchronously. */
function mockJugadorCrear(overrides: Partial<PlantillaJugador> = {}): void {
  const svc = TestBed.inject(JugadorService);
  const base: PlantillaJugador = {
    jugadorId: 101,
    nombre: overrides.nombre ?? 'Jugador Test',
    apellidos: '',
    posicion: overrides.posicion ?? 'Defensa',
    goles: 0,
    asistencias: 0,
    minutos: 0,
    tarjetasAmarillas: 0,
    tarjetasRojas: 0,
    impacto: 0,
    ...overrides,
  };
  vi.spyOn(svc, 'crear').mockReturnValue(of(base));
}

/** Returns a JugadorService spy that resolves eliminar() synchronously. */
function mockJugadorEliminar(): void {
  const svc = TestBed.inject(JugadorService);
  vi.spyOn(svc, 'eliminar').mockReturnValue(of(undefined as void));
}

// ── Helpers to reach the jugadores step without delay ─────────────────────

function advanceToJugadores(
  comp: SetupPageComponent,
  nombre = 'CD Test',
  id = 1,
): void {
  mockEquipoCrear(id, nombre);
  comp.equipoManual.nombre = nombre;
  comp.crearEquipoManual();
  // of() is synchronous → subscribe fires immediately, no tick needed
}

// ─────────────────────────────────────────────────────────────────────────────

describe('SetupPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [SetupPageComponent],
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

  // ── Smoke & initial state ───────────────────────────────────────────────
  it('should create', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start on metodo step', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    expect(fixture.componentInstance.paso).toBe('metodo');
  });

  // ── Method selection ────────────────────────────────────────────────────
  it('should navigate to api-key step when elegirMetodo("api") is called', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.elegirMetodo('api');
    expect(fixture.componentInstance.paso).toBe('api-key');
  });

  it('should navigate to manual step when elegirMetodo("manual") is called', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.elegirMetodo('manual');
    expect(fixture.componentInstance.paso).toBe('manual');
  });

  // ── volver() navigation ─────────────────────────────────────────────────
  it('should return to metodo step when volver() is called from api-key', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.paso = 'api-key';
    fixture.componentInstance.volver();
    expect(fixture.componentInstance.paso).toBe('metodo');
  });

  it('should return to metodo step when volver() is called from manual', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.paso = 'manual';
    fixture.componentInstance.volver();
    expect(fixture.componentInstance.paso).toBe('metodo');
  });

  // ── Validation errors ───────────────────────────────────────────────────
  it('should set error when cargarCompeticiones() called with empty apiKey', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.apiKey = '';
    fixture.componentInstance.cargarCompeticiones();
    expect(fixture.componentInstance.error).toBeTruthy();
  });

  it('should set error when crearEquipoManual() called with empty nombre', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.equipoManual.nombre = '';
    fixture.componentInstance.crearEquipoManual();
    expect(fixture.componentInstance.error).toBeTruthy();
  });

  it('should set error when confirmarEquipoApi() called with no team selected', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    fixture.componentInstance.equipoApiSeleccionado = null;
    fixture.componentInstance.confirmarEquipoApi();
    expect(fixture.componentInstance.error).toBeTruthy();
  });

  // ── jugadores step — reaching it ────────────────────────────────────────
  describe('jugadores step — after crearEquipoManual()', () => {
    it('should advance to jugadores step after successful team creation', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp, 'CD Test', 1);
      expect(comp.paso).toBe('jugadores');
    });

    it('should store the new team name in equipoRecienCreadoNombre', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp, 'Real Ejemplo', 2);
      expect(comp.equipoRecienCreadoNombre).toBe('Real Ejemplo');
    });

    it('should store the new team id in equipoRecienCreadoId', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp, 'FC ID Test', 42);
      expect(comp.equipoRecienCreadoId).toBe(42);
    });

    it('should start with an empty jugadoresAgregados list', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      expect(comp.jugadoresAgregados.length).toBe(0);
    });

    it('should reset nuevoJugador form when entering jugadores step', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      expect(comp.nuevoJugador.nombre).toBe('');
      expect(comp.nuevoJugador.posicion).toBe('');
    });
  });

  // ── jugadores step — agregarJugador() validation ────────────────────────
  describe('jugadores step — agregarJugador() validation', () => {
    it('should set an error when nombre is empty', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      comp.nuevoJugador.nombre = '';
      comp.nuevoJugador.posicion = 'Portero';
      comp.agregarJugador();
      expect(comp.error).toBeTruthy();
    });

    it('should set an error when nombre is whitespace-only', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      comp.nuevoJugador.nombre = '   ';
      comp.nuevoJugador.posicion = 'Defensa';
      comp.agregarJugador();
      expect(comp.error).toBeTruthy();
    });

    it('should set an error when posicion is empty', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      comp.nuevoJugador.nombre = 'Carlos';
      comp.nuevoJugador.posicion = '';
      comp.agregarJugador();
      expect(comp.error).toBeTruthy();
    });

    it('should not add a player to the list when validation fails', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      comp.nuevoJugador.nombre = '';
      comp.nuevoJugador.posicion = 'Portero';
      comp.agregarJugador();
      expect(comp.jugadoresAgregados.length).toBe(0);
    });
  });

  // ── jugadores step — agregarJugador() success ───────────────────────────
  describe('jugadores step — agregarJugador() success', () => {
    it('should add a player to jugadoresAgregados', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      mockJugadorCrear({ nombre: 'Luis', posicion: 'Delantero', jugadorId: 10 });

      comp.nuevoJugador.nombre = 'Luis';
      comp.nuevoJugador.posicion = 'Delantero';
      comp.agregarJugador();

      expect(comp.jugadoresAgregados.length).toBe(1);
      expect(comp.jugadoresAgregados[0].nombre).toBe('Luis');
    });

    it('should reset the nuevoJugador form after adding a player', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      mockJugadorCrear({ nombre: 'Marta', posicion: 'Centrocampista', jugadorId: 11 });

      comp.nuevoJugador.nombre = 'Marta';
      comp.nuevoJugador.posicion = 'Centrocampista';
      comp.nuevoJugador.dorsal = 8;
      comp.agregarJugador();

      expect(comp.nuevoJugador.nombre).toBe('');
      expect(comp.nuevoJugador.posicion).toBe('');
      expect(comp.nuevoJugador.dorsal).toBeUndefined();
    });

    it('should accumulate multiple players', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);

      const names = ['Ana', 'Bea', 'Carla'];
      names.forEach((nombre, i) => {
        mockJugadorCrear({ nombre, posicion: 'Defensa', jugadorId: 20 + i });
        comp.nuevoJugador.nombre = nombre;
        comp.nuevoJugador.posicion = 'Defensa';
        comp.agregarJugador();
      });

      expect(comp.jugadoresAgregados.length).toBe(3);
    });

    it('should clear any previous error after a successful add', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);

      // trigger a validation error first
      comp.nuevoJugador.nombre = '';
      comp.agregarJugador();
      expect(comp.error).toBeTruthy();

      // successful add clears it
      mockJugadorCrear({ nombre: 'Pedro', posicion: 'Portero', jugadorId: 30 });
      comp.nuevoJugador.nombre = 'Pedro';
      comp.nuevoJugador.posicion = 'Portero';
      comp.agregarJugador();

      expect(comp.error).toBeNull();
    });
  });

  // ── jugadores step — quitarJugador() ───────────────────────────────────
  describe('jugadores step — quitarJugador()', () => {
    it('should remove the player from jugadoresAgregados', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);
      mockJugadorCrear({ nombre: 'Rodrigo', posicion: 'Portero', jugadorId: 50 });
      mockJugadorEliminar();

      comp.nuevoJugador.nombre = 'Rodrigo';
      comp.nuevoJugador.posicion = 'Portero';
      comp.agregarJugador();
      expect(comp.jugadoresAgregados.length).toBe(1);

      comp.quitarJugador(50);
      expect(comp.jugadoresAgregados.length).toBe(0);
    });

    it('should only remove the targeted player when multiple exist', () => {
      const fixture = TestBed.createComponent(SetupPageComponent);
      const comp = fixture.componentInstance;
      advanceToJugadores(comp);

      // Add Pedro (id 60) then Juan (id 61)
      mockJugadorCrear({ nombre: 'Pedro', posicion: 'Defensa', jugadorId: 60 });
      comp.nuevoJugador.nombre = 'Pedro';
      comp.nuevoJugador.posicion = 'Defensa';
      comp.agregarJugador();

      mockJugadorCrear({ nombre: 'Juan', posicion: 'Defensa', jugadorId: 61 });
      comp.nuevoJugador.nombre = 'Juan';
      comp.nuevoJugador.posicion = 'Defensa';
      comp.agregarJugador();

      expect(comp.jugadoresAgregados.length).toBe(2);

      mockJugadorEliminar();
      comp.quitarJugador(60);

      expect(comp.jugadoresAgregados.length).toBe(1);
      expect(comp.jugadoresAgregados[0].nombre).toBe('Juan');
    });
  });
});
