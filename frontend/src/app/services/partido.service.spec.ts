import { TestBed } from '@angular/core/testing';
import { PartidoService, PartidoImportado } from './partido.service';

const P1: PartidoImportado = {
  rival:         'Liverpool',
  fecha:         '2024-03-15',
  esLocal:       true,
  golesNuestros: 2,
  golesRivales:  1,
  resultado:     'VICTORIA',
};

const P2: PartidoImportado = {
  rival:         'Chelsea',
  fecha:         '2024-03-08',
  esLocal:       false,
  golesNuestros: 0,
  golesRivales:  0,
  resultado:     'EMPATE',
};

describe('PartidoService', () => {
  let service: PartidoService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [PartidoService] });
    service = TestBed.inject(PartidoService);
  });

  afterEach(() => localStorage.clear());

  // ── listar ──────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('listar returns [] when no data stored for that team', () => {
    expect(service.listar(1)).toEqual([]);
  });

  it('listar returns [] for unknown equipoId even when other teams have data', () => {
    service.guardar(1, [P1]);
    expect(service.listar(99)).toEqual([]);
  });

  // ── guardar ─────────────────────────────────────

  it('guardar persists partidos and listar retrieves them', () => {
    service.guardar(1, [P1, P2]);
    expect(service.listar(1)).toHaveLength(2);
    expect(service.listar(1)[0].rival).toBe('Liverpool');
  });

  it('guardar overwrites previous partidos for the same team', () => {
    service.guardar(1, [P1, P2]);
    service.guardar(1, [P2]);
    expect(service.listar(1)).toHaveLength(1);
    expect(service.listar(1)[0].rival).toBe('Chelsea');
  });

  it('guardar does not affect other teams', () => {
    service.guardar(1, [P1]);
    service.guardar(2, [P2]);
    expect(service.listar(1)).toHaveLength(1);
    expect(service.listar(2)).toHaveLength(1);
    expect(service.listar(1)[0].rival).toBe('Liverpool');
    expect(service.listar(2)[0].rival).toBe('Chelsea');
  });

  it('guardar with [] effectively empties the list', () => {
    service.guardar(1, [P1]);
    service.guardar(1, []);
    expect(service.listar(1)).toEqual([]);
  });

  it('persists data in localStorage under the correct key', () => {
    service.guardar(1, [P1]);
    const raw = localStorage.getItem('coachlab_partidos');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed[1]).toHaveLength(1);
  });

  // ── limpiar ─────────────────────────────────────

  it('limpiar removes partidos for the specified team', () => {
    service.guardar(1, [P1]);
    service.limpiar(1);
    expect(service.listar(1)).toEqual([]);
  });

  it('limpiar does not remove other teams', () => {
    service.guardar(1, [P1]);
    service.guardar(2, [P2]);
    service.limpiar(1);
    expect(service.listar(2)).toHaveLength(1);
  });

  it('limpiar on non-existent team is a no-op', () => {
    expect(() => service.limpiar(999)).not.toThrow();
  });

  // ── Persistence across instances ────────────────

  it('data persists across service re-instantiation (localStorage round-trip)', () => {
    service.guardar(1, [P1]);

    // Simulate page reload: create a new service instance from the same localStorage
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [PartidoService] });
    const service2 = TestBed.inject(PartidoService);

    expect(service2.listar(1)).toHaveLength(1);
    expect(service2.listar(1)[0].rival).toBe('Liverpool');
  });
});
