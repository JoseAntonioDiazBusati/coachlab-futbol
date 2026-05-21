import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { RegistrarPartidoPageComponent } from './registrar-partido-page.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { JugadorService, PlantillaJugador } from '../../services/jugador.service';
import {
  PartidoRegistradoService,
  PartidoRegistrado,
  calcularResultado,
} from '../../services/partido-registrado.service';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const EQUIPO_MOCK: Equipo = {
  id: 1,
  nombre: 'Arsenal FC',
  categoria: 'Premier League',
  temporada: '2025/2026',
};

const JUGADOR_A: PlantillaJugador = {
  jugadorId: 10, nombre: 'Saka', posicion: 'Delantero',
  dorsal: 7, goles: 5, asistencias: 3, minutos: 900,
  tarjetasAmarillas: 1, tarjetasRojas: 0, impacto: 20,
};

const JUGADOR_B: PlantillaJugador = {
  jugadorId: 22, nombre: 'Raya', posicion: 'Portero',
  dorsal: 22, goles: 0, asistencias: 0, minutos: 810,
  tarjetasAmarillas: 0, tarjetasRojas: 0, impacto: 2,
};

const PARTIDO_MOCK: PartidoRegistrado = {
  id: 1,
  rival: 'Real Madrid',
  fecha: '2024-03-15',
  esLocal: true,
  competicion: 'Liga',
  golesNuestros: 2,
  golesRivales: 1,
  resultado: 'VICTORIA',
  jugadoresIds: [10, 22],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function stubEquiposConJugadores(
  partidos: PartidoRegistrado[] = [],
): void {
  vi.spyOn(TestBed.inject(EquipoService), 'listar')
    .mockReturnValue(of([EQUIPO_MOCK]));
  vi.spyOn(TestBed.inject(JugadorService), 'listarPlantilla')
    .mockReturnValue(of([JUGADOR_A, JUGADOR_B]));
  vi.spyOn(TestBed.inject(PartidoRegistradoService), 'listar')
    .mockReturnValue(partidos);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('calcularResultado()', () => {
  it('returns VICTORIA when golesNuestros > golesRivales', () => {
    expect(calcularResultado(3, 1)).toBe('VICTORIA');
  });

  it('returns DERROTA when golesNuestros < golesRivales', () => {
    expect(calcularResultado(0, 2)).toBe('DERROTA');
  });

  it('returns EMPATE when scores are equal', () => {
    expect(calcularResultado(1, 1)).toBe('EMPATE');
  });

  it('returns EMPATE for 0-0', () => {
    expect(calcularResultado(0, 0)).toBe('EMPATE');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('PartidoRegistradoService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('listar() returns empty array when no data', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    expect(svc.listar(1)).toEqual([]);
  });

  it('guardar() creates a partido and returns it', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const payload = {
      rival: 'Real Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      resultado: 'VICTORIA' as const, jugadoresIds: [10],
    };
    const partido = svc.guardar(1, payload);
    expect(partido.id).toBe(1);
    expect(partido.rival).toBe('Real Madrid');
  });

  it('guardar() increments id automatically', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const base = {
      rival: 'X', fecha: '2024-01-01', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      resultado: 'VICTORIA' as const, jugadoresIds: [],
    };
    const p1 = svc.guardar(1, base);
    const p2 = svc.guardar(1, { ...base, rival: 'Y' });
    expect(p2.id).toBe(p1.id + 1);
  });

  it('guardar() prepends newest partido (most-recent-first)', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const base = {
      rival: 'X', fecha: '2024-01-01', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      resultado: 'VICTORIA' as const, jugadoresIds: [],
    };
    svc.guardar(1, base);
    svc.guardar(1, { ...base, rival: 'Y' });
    const lista = svc.listar(1);
    expect(lista[0].rival).toBe('Y');
    expect(lista[1].rival).toBe('X');
  });

  it('listar() returns the persisted partidos', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const payload = {
      rival: 'Real Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      resultado: 'VICTORIA' as const, jugadoresIds: [10],
    };
    svc.guardar(1, payload);
    expect(svc.listar(1)).toHaveLength(1);
    expect(svc.listar(1)[0].rival).toBe('Real Madrid');
  });

  it('eliminar() removes the correct partido', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const base = {
      rival: 'X', fecha: '2024-01-01', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      resultado: 'VICTORIA' as const, jugadoresIds: [],
    };
    const p1 = svc.guardar(1, base);
    const p2 = svc.guardar(1, { ...base, rival: 'Y' });
    svc.eliminar(1, p1.id);
    const lista = svc.listar(1);
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(p2.id);
  });

  it('eliminar() is a no-op when partido does not exist', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    expect(() => svc.eliminar(1, 999)).not.toThrow();
  });

  it('limpiar() removes all partidos for the team', () => {
    const svc = TestBed.inject(PartidoRegistradoService);
    const base = {
      rival: 'X', fecha: '2024-01-01', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      resultado: 'VICTORIA' as const, jugadoresIds: [],
    };
    svc.guardar(1, base);
    svc.limpiar(1);
    expect(svc.listar(1)).toHaveLength(0);
  });

  afterEach(() => { localStorage.clear(); });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('RegistrarPartidoPageComponent', () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [RegistrarPartidoPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        EquipoService,
        EquipoActivoService,
        JugadorService,
        PartidoRegistradoService,
      ],
    }).compileComponents();
  });

  afterEach(() => { localStorage.clear(); });

  // ── Smoke ────────────────────────────────────────
  it('should create', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp).toBeTruthy();
  });

  // ── cargarDatos() ────────────────────────────────
  it('loads the active team on init', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.equipo?.nombre).toBe('Arsenal FC');
  });

  it('loads jugadores for the active team', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.jugadores).toHaveLength(2);
  });

  it('loads existing partidos from the service', () => {
    stubEquiposConJugadores([PARTIDO_MOCK]);
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.partidos).toHaveLength(1);
    expect(comp.partidos[0].rival).toBe('Real Madrid');
  });

  it('sets sinEquipo = true when no equipo is found', () => {
    vi.spyOn(TestBed.inject(EquipoService), 'listar').mockReturnValue(of([]));
    vi.spyOn(TestBed.inject(JugadorService), 'listarPlantilla').mockReturnValue(of([]));
    vi.spyOn(TestBed.inject(PartidoRegistradoService), 'listar').mockReturnValue([]);
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.ngOnInit();
    expect(comp.sinEquipo).toBe(true);
  });

  // ── abrirFormulario() / cerrarFormulario() ───────
  it('abrirFormulario() sets mostrarFormulario = true', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.abrirFormulario();
    expect(comp.mostrarFormulario).toBe(true);
  });

  it('abrirFormulario() resets the form fields', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo.rival = 'Sevilla';
    comp.abrirFormulario();
    expect(comp.nuevo.rival).toBe('');
  });

  it('cerrarFormulario() sets mostrarFormulario = false', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.mostrarFormulario = true;
    comp.cerrarFormulario();
    expect(comp.mostrarFormulario).toBe(false);
  });

  // ── formularioValido ──────────────────────────────
  it('formularioValido is false when rival is empty', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo = {
      rival: '', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      jugadoresSeleccionados: new Set(),
    };
    expect(comp.formularioValido).toBe(false);
  });

  it('formularioValido is false when competicion is empty', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: '', golesNuestros: 1, golesRivales: 0,
      jugadoresSeleccionados: new Set(),
    };
    expect(comp.formularioValido).toBe(false);
  });

  it('formularioValido is false when golesNuestros is null', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: null, golesRivales: 1,
      jugadoresSeleccionados: new Set(),
    };
    expect(comp.formularioValido).toBe(false);
  });

  it('formularioValido is true when all required fields are filled', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      jugadoresSeleccionados: new Set(),
    };
    expect(comp.formularioValido).toBe(true);
  });

  it('formularioValido is true for 0-0 result', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Copa', golesNuestros: 0, golesRivales: 0,
      jugadoresSeleccionados: new Set(),
    };
    expect(comp.formularioValido).toBe(true);
  });

  // ── guardar() ────────────────────────────────────
  it('guardar() calls partidoService.guardar() and adds the partido to the list', () => {
    stubEquiposConJugadores();
    const savedPartido: PartidoRegistrado = {
      id: 1, rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      resultado: 'VICTORIA', jugadoresIds: [],
    };
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar')
      .mockReturnValue(savedPartido);

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 2, golesRivales: 1,
      jugadoresSeleccionados: new Set(),
    };

    comp.guardar();

    expect(spy).toHaveBeenCalledOnce();
    expect(comp.partidos).toHaveLength(1);
    expect(comp.partidos[0].id).toBe(1);
  });

  it('guardar() computes the resultado automatically (VICTORIA)', () => {
    stubEquiposConJugadores();
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar')
      .mockReturnValue({ id: 1 } as PartidoRegistrado);

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 3, golesRivales: 1,
      jugadoresSeleccionados: new Set(),
    };
    comp.guardar();

    const payload = spy.mock.calls[0][1];
    expect(payload.resultado).toBe('VICTORIA');
  });

  it('guardar() computes the resultado automatically (DERROTA)', () => {
    stubEquiposConJugadores();
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar')
      .mockReturnValue({ id: 1 } as PartidoRegistrado);

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: false,
      competicion: 'Liga', golesNuestros: 0, golesRivales: 2,
      jugadoresSeleccionados: new Set(),
    };
    comp.guardar();

    const payload = spy.mock.calls[0][1];
    expect(payload.resultado).toBe('DERROTA');
  });

  it('guardar() passes selected jugadores IDs to the service', () => {
    stubEquiposConJugadores();
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar')
      .mockReturnValue({ id: 1 } as PartidoRegistrado);

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      jugadoresSeleccionados: new Set([10, 22]),
    };
    comp.guardar();

    const payload = spy.mock.calls[0][1];
    expect(payload.jugadoresIds).toContain(10);
    expect(payload.jugadoresIds).toContain(22);
  });

  it('guardar() closes the form on success', () => {
    stubEquiposConJugadores();
    vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar')
      .mockReturnValue({ id: 1 } as PartidoRegistrado);

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.mostrarFormulario = true;
    comp.nuevo = {
      rival: 'Madrid', fecha: '2024-03-15', esLocal: true,
      competicion: 'Liga', golesNuestros: 1, golesRivales: 0,
      jugadoresSeleccionados: new Set(),
    };
    comp.guardar();

    expect(comp.mostrarFormulario).toBe(false);
  });

  it('guardar() does nothing when equipo is null', () => {
    stubEquiposConJugadores();
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'guardar');

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = null;
    comp.guardar();

    expect(spy).not.toHaveBeenCalled();
  });

  // ── eliminarPartido() ─────────────────────────────
  it('eliminarPartido() calls service and removes partido from list', () => {
    stubEquiposConJugadores([PARTIDO_MOCK]);
    const spy = vi.spyOn(TestBed.inject(PartidoRegistradoService), 'eliminar');

    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.equipo = EQUIPO_MOCK;
    comp.partidos = [PARTIDO_MOCK];

    comp.eliminarPartido(PARTIDO_MOCK.id);

    expect(spy).toHaveBeenCalledWith(EQUIPO_MOCK.id, PARTIDO_MOCK.id);
    expect(comp.partidos).toHaveLength(0);
  });

  // ── toggleJugador() ───────────────────────────────
  it('toggleJugador() adds a player to the selection', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.toggleJugador(10);
    expect(comp.jugadorEstaSeleccionado(10)).toBe(true);
  });

  it('toggleJugador() removes a player that was already selected', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo.jugadoresSeleccionados.add(10);
    comp.toggleJugador(10);
    expect(comp.jugadorEstaSeleccionado(10)).toBe(false);
  });

  // ── seleccionarTodos() / deseleccionarTodos() ─────
  it('seleccionarTodos() selects every jugador in the list', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.jugadores = [JUGADOR_A, JUGADOR_B];
    comp.seleccionarTodos();
    expect(comp.jugadorEstaSeleccionado(JUGADOR_A.jugadorId)).toBe(true);
    expect(comp.jugadorEstaSeleccionado(JUGADOR_B.jugadorId)).toBe(true);
  });

  it('deseleccionarTodos() clears the selection', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.nuevo.jugadoresSeleccionados.add(10);
    comp.nuevo.jugadoresSeleccionados.add(22);
    comp.deseleccionarTodos();
    expect(comp.nuevo.jugadoresSeleccionados.size).toBe(0);
  });

  // ── jugadoresDelPartido() ─────────────────────────
  it('jugadoresDelPartido() returns only jugadores that participated', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.jugadores = [JUGADOR_A, JUGADOR_B];
    const resultado = comp.jugadoresDelPartido(PARTIDO_MOCK);
    expect(resultado).toHaveLength(2);
    expect(resultado.map((j) => j.jugadorId)).toContain(10);
    expect(resultado.map((j) => j.jugadorId)).toContain(22);
  });

  it('jugadoresDelPartido() returns empty when no ids match', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    comp.jugadores = [JUGADOR_A, JUGADOR_B];
    const sin = { ...PARTIDO_MOCK, jugadoresIds: [999] };
    expect(comp.jugadoresDelPartido(sin)).toHaveLength(0);
  });

  // ── Helpers de presentación ───────────────────────
  it('resultadoClass() returns "win" for VICTORIA', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoClass('VICTORIA')).toBe('win');
  });

  it('resultadoClass() returns "loss" for DERROTA', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoClass('DERROTA')).toBe('loss');
  });

  it('resultadoClass() returns "draw" for EMPATE', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoClass('EMPATE')).toBe('draw');
  });

  it('resultadoLabel() returns "Victoria" for VICTORIA', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoLabel('VICTORIA')).toBe('Victoria');
  });

  it('resultadoLabel() returns "Derrota" for DERROTA', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoLabel('DERROTA')).toBe('Derrota');
  });

  it('resultadoLabel() returns "Empate" for EMPATE', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.resultadoLabel('EMPATE')).toBe('Empate');
  });

  it('fechaFormateada() formats YYYY-MM-DD to DD/MM/YYYY', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.fechaFormateada('2024-03-15')).toBe('15/03/2024');
  });

  it('fechaFormateada() returns empty string for empty input', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.fechaFormateada('')).toBe('');
  });

  it('condicionLabel() returns "Local" when esLocal is true', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.condicionLabel(true)).toBe('Local');
  });

  it('condicionLabel() returns "Visitante" when esLocal is false', () => {
    stubEquiposConJugadores();
    const comp = TestBed.createComponent(RegistrarPartidoPageComponent).componentInstance;
    expect(comp.condicionLabel(false)).toBe('Visitante');
  });
});
