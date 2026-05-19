import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { JugadorService, PlantillaJugador, calcularIRE } from './jugador.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePayload(overrides: {
  posicion?: string;
  goles?: number;
  asistencias?: number;
  tarjetasAmarillas?: number;
  tarjetasRojas?: number;
  paradasLimpias?: number;
  golesEncajados?: number;
  penaltisParados?: number;
} = {}) {
  return {
    posicion: 'Delantero',
    goles: 0,
    asistencias: 0,
    tarjetasAmarillas: 0,
    tarjetasRojas: 0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('calcularIRE()', () => {

  // ── Field players ────────────────────────────────────────────────────────

  it('returns 0 for a field player with no stats', () => {
    expect(calcularIRE(makePayload())).toBe(0);
  });

  it('goals contribute 3 points each', () => {
    expect(calcularIRE(makePayload({ goles: 5 }))).toBe(15);
  });

  it('assists contribute 2 points each', () => {
    expect(calcularIRE(makePayload({ asistencias: 4 }))).toBe(8);
  });

  it('goals and assists combine correctly', () => {
    // 3 goals × 3 + 2 assists × 2 = 9 + 4 = 13
    expect(calcularIRE(makePayload({ goles: 3, asistencias: 2 }))).toBe(13);
  });

  it('yellow cards deduct 0.5 each', () => {
    expect(calcularIRE(makePayload({ goles: 10, tarjetasAmarillas: 2 }))).toBe(29);
    // 10*3 - 2*0.5 = 30 - 1 = 29
  });

  it('red cards deduct 2 each', () => {
    expect(calcularIRE(makePayload({ goles: 5, tarjetasRojas: 1 }))).toBe(13);
    // 15 - 2 = 13
  });

  it('can produce a negative IRE when cards outweigh contributions', () => {
    expect(calcularIRE(makePayload({ tarjetasRojas: 3 }))).toBe(-6);
  });

  it('result is rounded to one decimal place', () => {
    // 1 goal + 1 yellow: 3 - 0.5 = 2.5 → already 1 decimal
    expect(calcularIRE(makePayload({ goles: 1, tarjetasAmarillas: 1 }))).toBe(2.5);
  });

  it('Centrocampista and Defensa use the same field formula', () => {
    const centro = calcularIRE(makePayload({ posicion: 'Centrocampista', goles: 2, asistencias: 3 }));
    const defensa = calcularIRE(makePayload({ posicion: 'Defensa', goles: 2, asistencias: 3 }));
    expect(centro).toBe(12);  // 6 + 6
    expect(defensa).toBe(12);
  });

  // ── Goalkeeper ───────────────────────────────────────────────────────────

  it('returns 0 for a goalkeeper with no stats', () => {
    expect(calcularIRE(makePayload({ posicion: 'Portero' }))).toBe(0);
  });

  it('clean sheets contribute 3 points each for goalkeepers', () => {
    expect(calcularIRE(makePayload({ posicion: 'Portero', paradasLimpias: 5 }))).toBe(15);
  });

  it('penalty saves contribute 2 points each for goalkeepers', () => {
    expect(calcularIRE(makePayload({ posicion: 'Portero', penaltisParados: 3 }))).toBe(6);
  });

  it('goals conceded deduct 0.3 each for goalkeepers', () => {
    // 10 clean sheets (30) - 20 goals conceded (6) = 24
    expect(calcularIRE(makePayload({ posicion: 'Portero', paradasLimpias: 10, golesEncajados: 20 }))).toBe(24);
  });

  it('goalkeeper yellow cards still deduct 0.5 each', () => {
    expect(calcularIRE(makePayload({ posicion: 'Portero', paradasLimpias: 10, tarjetasAmarillas: 2 }))).toBe(29);
  });

  it('goals field is NOT counted for goalkeepers', () => {
    // Goalkeeper who scored a goal — goals should not be counted in their IRE
    const ireGk = calcularIRE(makePayload({ posicion: 'Portero', goles: 5 }));
    expect(ireGk).toBe(0);  // goals don't count for goalkeeper formula
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('JugadorService — IRE propagation', () => {
  let service: JugadorService;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.useFakeTimers();   // delay() uses setTimeout; fake timers let us control it
    TestBed.configureTestingModule({ providers: [JugadorService] });
    service = TestBed.inject(JugadorService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Convenience: call crear() and advance timers to resolve the delay. */
  function crearSync(teamId: number, payload: Parameters<JugadorService['crear']>[1]): PlantillaJugador {
    let result: PlantillaJugador | undefined;
    service.crear(teamId, payload).subscribe(j => { result = j; });
    vi.runAllTimers();
    return result!;
  }

  // ── crear() ──────────────────────────────────────────────────────────────

  it('crear() sets impacto to 0 for a new player with no stats', () => {
    const j = crearSync(1, { nombre: 'Ana', posicion: 'Defensa' });
    expect(j.impacto).toBe(0);
  });

  it('crear() computes non-zero IRE when stats are provided', () => {
    const j = crearSync(1, { nombre: 'Luis', posicion: 'Delantero', goles: 10, asistencias: 5 });
    // 10*3 + 5*2 = 40
    expect(j.impacto).toBe(40);
  });

  it('crear() goalkeeper with no stats has IRE = 0', () => {
    const j = crearSync(1, { nombre: 'Diego', posicion: 'Portero' });
    expect(j.impacto).toBe(0);
  });

  it('crear() deducts for red cards even without goals', () => {
    const j = crearSync(1, { nombre: 'Test', posicion: 'Centrocampista', tarjetasRojas: 2 });
    expect(j.impacto).toBe(-4);  // 2 * -2
  });

  // ── importarPlantilla() — synchronous, no timer needed ───────────────────

  it('importarPlantilla() computes IRE for each player', () => {
    const result = service.importarPlantilla(1, [
      { nombre: 'Striker', posicion: 'Delantero', goles: 20, asistencias: 5 },
      { nombre: 'Keeper',  posicion: 'Portero' },
    ]);
    // Striker: 20*3 + 5*2 = 70
    expect(result[0].impacto).toBe(70);
    // Keeper with no stats: 0
    expect(result[1].impacto).toBe(0);
  });

  it('importarPlantilla() computes high IRE for an elite scorer', () => {
    const [messi] = service.importarPlantilla(2, [
      { nombre: 'Messi', posicion: 'Delantero', goles: 30, asistencias: 10 },
    ]);
    // 30*3 + 10*2 = 110
    expect(messi.impacto).toBe(110);
  });

  it('importarPlantilla() penalizes disciplinary record', () => {
    const [j] = service.importarPlantilla(1, [
      { nombre: 'Reckless', posicion: 'Defensa', goles: 2, tarjetasAmarillas: 4, tarjetasRojas: 1 },
    ]);
    // 6 - 2 - 2 = 2
    expect(j.impacto).toBe(2);
  });

  // ── actualizar() ────────────────────────────────────────────────────────

  it('actualizar() recomputes IRE when goals are updated', () => {
    const created = crearSync(1, { nombre: 'Carlos', posicion: 'Delantero', goles: 5 });
    // IRE before: 5*3 = 15

    let updated: PlantillaJugador | undefined;
    service.actualizar(1, created.jugadorId, { goles: 15 }).subscribe(u => { updated = u; });
    vi.runAllTimers();

    expect(updated!.impacto).toBeGreaterThan(created.impacto);
    expect(updated!.impacto).toBe(45);  // 15 * 3
  });

  it('actualizar() recomputes IRE when cards are added', () => {
    const created = crearSync(1, { nombre: 'Pedro', posicion: 'Defensa', goles: 2 });
    // IRE before: 6

    let updated: PlantillaJugador | undefined;
    service.actualizar(1, created.jugadorId, { tarjetasRojas: 1 }).subscribe(u => { updated = u; });
    vi.runAllTimers();

    // 2*3 - 1*2 = 4
    expect(updated!.impacto).toBe(4);
  });
});
