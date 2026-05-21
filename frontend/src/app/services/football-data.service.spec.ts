import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
  FdGoleador,
  FdJugadorSquad,
  FdMatch,
} from './football-data.service';

/**
 * Tests del FootballDataService en la arquitectura BFF.
 *
 * Cambios respecto a la versión anterior:
 * - Sin API key en el cliente: la clave vive en el servidor.
 * - Las peticiones van a /api/fd/* (proxy del backend).
 * - Las respuestas son arrays directos (no envueltos en {competitions:[...]}).
 * - No hay cabecera X-Auth-Token en las peticiones del frontend.
 * - tieneApiKey() siempre devuelve true (el servidor gestiona la clave).
 * - getApiKey() siempre devuelve null.
 */
describe('FootballDataService (BFF proxy)', () => {
  let service: FootballDataService;
  let httpMock: HttpTestingController;

  const BASE = '/api/fd';

  beforeEach(() => {
    localStorage.removeItem('coachlab_fd_api_base');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FootballDataService,
      ],
    });
    service  = TestBed.inject(FootballDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('coachlab_fd_api_base');
  });

  // ── Instanciación ────────────────────────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  // ── API key stub: la clave ya no existe en el cliente ────────────────────

  it('getApiKey() siempre devuelve null (la clave está en el servidor)', () => {
    expect(service.getApiKey()).toBeNull();
  });

  it('tieneApiKey() siempre devuelve true (el servidor tiene la clave)', () => {
    expect(service.tieneApiKey()).toBe(true);
  });

  it('setApiKey() es un no-op (no lanza ni hace peticiones)', () => {
    service.setApiKey('cualquier-valor');
    httpMock.expectNone(/.*/);
    expect(service.getApiKey()).toBeNull(); // sigue siendo null
  });

  // ── listarCompeticiones ──────────────────────────────────────────────────

  it('llama a GET /api/fd/competiciones y devuelve el array', () => {
    const mock: FdCompeticion[] = [
      { id: 2021, code: 'PL', name: 'Premier League', area: { name: 'England' } },
      { id: 2014, code: 'PD', name: 'Primera División', area: { name: 'Spain' } },
    ];
    let result: FdCompeticion[] = [];

    service.listarCompeticiones().subscribe((c) => (result = c));

    const req = httpMock.expectOne(`${BASE}/competiciones`);
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('X-Auth-Token')).toBe(false); // no API key en cliente
    req.flush(mock);

    expect(result).toHaveLength(2);
    expect(result[0].code).toBe('PL');
    expect(result[1].code).toBe('PD');
  });

  it('propaga el error HTTP de /api/fd/competiciones', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne(`${BASE}/competiciones`).flush(
      { message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' },
    );
    expect(errorMsg).toContain('403');
  });

  it('propaga el error 429 (rate-limit) de /api/fd/competiciones', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne(`${BASE}/competiciones`).flush(
      { message: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' },
    );
    expect(errorMsg).toContain('429');
  });

  it('propaga el error 404 de /api/fd/competiciones', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne(`${BASE}/competiciones`).flush(
      { message: 'Not Found' }, { status: 404, statusText: 'Not Found' },
    );
    expect(errorMsg).toContain('404');
  });

  it('propaga el error de red (status 0) de /api/fd/competiciones', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock
      .expectOne(`${BASE}/competiciones`)
      .error(new ProgressEvent('error'), { status: 0 });
    expect(errorMsg.toLowerCase()).toContain('red');
  });

  // ── listarEquipos ────────────────────────────────────────────────────────

  it('llama a GET /api/fd/competiciones/{code}/equipos y devuelve el array', () => {
    const mock: FdEquipo[] = [
      { id: 57, name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS', area: { name: 'England' } },
    ];
    let result: FdEquipo[] = [];

    service.listarEquipos('PL').subscribe((t) => (result = t));

    const req = httpMock.expectOne(`${BASE}/competiciones/PL/equipos`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(result).toHaveLength(1);
    expect(result[0].tla).toBe('ARS');
  });

  it('propaga el error de /api/fd/competiciones/{code}/equipos', () => {
    let errorMsg = '';
    service.listarEquipos('INVALID').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne(`${BASE}/competiciones/INVALID/equipos`).flush(
      {}, { status: 404, statusText: 'Not Found' },
    );
    expect(errorMsg).toContain('404');
  });

  // ── listarPlantillaEquipo ────────────────────────────────────────────────

  it('llama a GET /api/fd/teams/{id} y devuelve la plantilla', () => {
    const mock: FdJugadorSquad[] = [
      { id: 1, name: 'Bukayo Saka', position: 'Attacker', shirtNumber: 7 },
    ];
    let result: FdJugadorSquad[] = [];

    service.listarPlantillaEquipo(57).subscribe((s) => (result = s));

    const req = httpMock.expectOne(`${BASE}/teams/57`);
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bukayo Saka');
  });

  it('propaga el error de /api/fd/teams/{id}', () => {
    let errorMsg = '';
    service.listarPlantillaEquipo(99999).subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne(`${BASE}/teams/99999`).flush(
      {}, { status: 404, statusText: 'Not Found' },
    );
    expect(errorMsg).toContain('404');
  });

  // ── listarPartidosEquipo ─────────────────────────────────────────────────

  it('llama a GET /api/fd/teams/{id}/matches con params limit', () => {
    const match: FdMatch = {
      id: 1,
      utcDate: '2024-03-15T15:00:00Z',
      status: 'FINISHED',
      competition: { id: 2021, code: 'PL', name: 'Premier League' },
      homeTeam: { id: 57, name: 'Arsenal FC', shortName: 'Arsenal' },
      awayTeam: { id: 64, name: 'Liverpool FC', shortName: 'Liverpool' },
      score: { fullTime: { home: 2, away: 1 } },
    };
    let result: FdMatch[] = [];

    service.listarPartidosEquipo(57).subscribe((m) => (result = m));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/teams/57/matches`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush([match]);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('acepta un limit personalizado', () => {
    service.listarPartidosEquipo(57, 5).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/teams/57/matches`);
    expect(req.request.params.get('limit')).toBe('5');
    req.flush([]);
  });

  it('incluye competicionId cuando se proporciona', () => {
    service.listarPartidosEquipo(57, 10, 2014).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/teams/57/matches`);
    expect(req.request.params.get('competicionId')).toBe('2014');
    req.flush([]);
  });

  it('omite competicionId cuando es undefined', () => {
    service.listarPartidosEquipo(57, 10).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/teams/57/matches`);
    expect(req.request.params.has('competicionId')).toBe(false);
    req.flush([]);
  });

  // ── listarGoleadores ─────────────────────────────────────────────────────

  it('llama a GET /api/fd/competiciones/{code}/scorers con limit', () => {
    const mock: FdGoleador[] = [
      {
        player: { id: 1, name: 'Robert Lewandowski', position: 'Attacker' },
        team: { id: 81, name: 'FC Barcelona' },
        playedMatches: 10,
        goals: 8,
        assists: 2,
        penalties: 1,
      },
    ];
    let result: FdGoleador[] = [];

    service.listarGoleadores('PD').subscribe((s) => (result = s));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/competiciones/PD/scorers`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('limit')).toBe('50');
    req.flush(mock);

    expect(result).toHaveLength(1);
    expect(result[0].player.name).toBe('Robert Lewandowski');
    expect(result[0].goals).toBe(8);
  });

  it('incluye season cuando se proporciona', () => {
    service.listarGoleadores('PD', 2025).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/competiciones/PD/scorers`);
    expect(req.request.params.get('season')).toBe('2025');
    req.flush([]);
  });

  it('omite season cuando no se proporciona', () => {
    service.listarGoleadores('PD').subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/competiciones/PD/scorers`);
    expect(req.request.params.has('season')).toBe(false);
    req.flush([]);
  });

  it('acepta un limit personalizado', () => {
    service.listarGoleadores('PD', undefined, 20).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${BASE}/competiciones/PD/scorers`);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush([]);
  });

  it('propaga el error de /api/fd/competiciones/{code}/scorers', () => {
    let errorMsg = '';
    service.listarGoleadores('PD').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne((r) => r.url === `${BASE}/competiciones/PD/scorers`).flush(
      {}, { status: 403, statusText: 'Forbidden' },
    );
    expect(errorMsg).toContain('403');
  });
});
