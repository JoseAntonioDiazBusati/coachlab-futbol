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
  FdJugadorSquad,
  FdMatch,
} from './football-data.service';

const KEY = 'test-api-key-123';

describe('FootballDataService', () => {
  let service: FootballDataService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.removeItem('coachlab_football_api_key');
    localStorage.removeItem('coachlab_fd_api_base');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FootballDataService,
      ],
    });
    service = TestBed.inject(FootballDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem('coachlab_football_api_key');
    localStorage.removeItem('coachlab_fd_api_base');
  });

  // ── API key ─────────────────────────────────────

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('tieneApiKey returns false when no key stored', () => {
    expect(service.tieneApiKey()).toBe(false);
  });

  it('setApiKey / getApiKey round-trip', () => {
    service.setApiKey(KEY);
    expect(service.getApiKey()).toBe(KEY);
    expect(service.tieneApiKey()).toBe(true);
  });

  it('setApiKey trims whitespace', () => {
    service.setApiKey('  abc123  ');
    expect(service.getApiKey()).toBe('abc123');
  });

  // ── API base ─────────────────────────────────────

  it('getApiBase returns dev default when no override', () => {
    expect(service.getApiBase()).toBe('/fd-api/v4');
  });

  it('setApiBase overrides the default', () => {
    service.setApiBase('https://my-proxy.example.com/v4');
    expect(service.getApiBase()).toBe('https://my-proxy.example.com/v4');
  });

  it('setApiBase with empty string removes the override', () => {
    service.setApiBase('https://my-proxy.example.com/v4');
    service.setApiBase('');
    expect(service.getApiBase()).toBe('/fd-api/v4');
  });

  it('resetApiBase restores environment default', () => {
    service.setApiBase('https://custom.example.com');
    service.resetApiBase();
    expect(service.getApiBase()).toBe('/fd-api/v4');
  });

  it('setApiBase strips trailing slash', () => {
    service.setApiBase('https://my-proxy.example.com/v4/');
    expect(service.getApiBase()).toBe('https://my-proxy.example.com/v4');
  });

  it('setApiBase normalizes before storing — trailing slash is absent in localStorage', () => {
    service.setApiBase('https://my-proxy.example.com/v4/');
    // Normalization must happen at save time, not only at read time, so that
    // any direct localStorage reads (e.g. devtools) also see clean values.
    expect(localStorage.getItem('coachlab_fd_api_base')).toBe(
      'https://my-proxy.example.com/v4',
    );
  });

  // ── listarCompeticiones ──────────────────────────

  it('listarCompeticiones errors when no API key', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    expect(errorMsg).toContain('API key');
  });

  it('listarCompeticiones calls correct URL with X-Auth-Token header', () => {
    service.setApiKey(KEY);
    const mock: FdCompeticion[] = [
      { id: 1, code: 'PL', name: 'Premier League', area: { name: 'England' } },
      { id: 2, code: 'PD', name: 'Primera División', area: { name: 'Spain' } },
    ];
    let result: FdCompeticion[] = [];
    service.listarCompeticiones().subscribe((c) => (result = c));

    const req = httpMock.expectOne('/fd-api/v4/competitions');
    expect(req.request.headers.get('X-Auth-Token')).toBe(KEY);
    req.flush({ competitions: mock });
    expect(result.length).toBe(2);
    expect(result[0].code).toBe('PL');
  });

  it('listarCompeticiones filters competitions without code', () => {
    service.setApiKey(KEY);
    const mock = [
      { id: 1, code: 'PL', name: 'Premier League', area: { name: 'England' } },
      { id: 2, code: '',   name: 'No Code',         area: { name: 'Unknown' } },
      { id: 3, code: 'PD', name: 'Primera División', area: { name: 'Spain' } },
    ];
    let result: FdCompeticion[] = [];
    service.listarCompeticiones().subscribe((c) => (result = c));
    httpMock.expectOne('/fd-api/v4/competitions').flush({ competitions: mock });
    expect(result.length).toBe(2);
  });

  it('listarCompeticiones handles null competitions response', () => {
    service.setApiKey(KEY);
    let result: FdCompeticion[] | null = null;
    service.listarCompeticiones().subscribe((c) => (result = c));
    httpMock.expectOne('/fd-api/v4/competitions').flush({ competitions: null });
    expect(result).toEqual([]);
  });

  // ── listarEquipos ────────────────────────────────

  it('listarEquipos errors when no API key', () => {
    let errorMsg = '';
    service.listarEquipos('PL').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    expect(errorMsg).toContain('API key');
  });

  it('listarEquipos calls correct URL', () => {
    service.setApiKey(KEY);
    const mock: FdEquipo[] = [
      { id: 57, name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS', area: { name: 'England' } },
    ];
    let result: FdEquipo[] = [];
    service.listarEquipos('PL').subscribe((t) => (result = t));

    const req = httpMock.expectOne('/fd-api/v4/competitions/PL/teams');
    expect(req.request.headers.get('X-Auth-Token')).toBe(KEY);
    req.flush({ teams: mock });
    expect(result.length).toBe(1);
    expect(result[0].tla).toBe('ARS');
  });

  it('listarEquipos handles null teams response', () => {
    service.setApiKey(KEY);
    let result: FdEquipo[] | null = null;
    service.listarEquipos('PL').subscribe((t) => (result = t));
    httpMock.expectOne('/fd-api/v4/competitions/PL/teams').flush({ teams: null });
    expect(result).toEqual([]);
  });

  // ── Error messages ───────────────────────────────

  it('returns clear 403 message', () => {
    service.setApiKey(KEY);
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne('/fd-api/v4/competitions').flush(
      { message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' },
    );
    expect(errorMsg).toContain('403');
    expect(errorMsg.toLowerCase()).toContain('api key');
  });

  it('returns clear 429 message with rate-limit hint', () => {
    service.setApiKey(KEY);
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne('/fd-api/v4/competitions').flush(
      { message: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' },
    );
    expect(errorMsg).toContain('429');
    expect(errorMsg).toContain('req/min');
  });

  it('returns clear 404 message', () => {
    service.setApiKey(KEY);
    let errorMsg = '';
    service.listarEquipos('INVALID').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock.expectOne('/fd-api/v4/competitions/INVALID/teams').flush(
      { message: 'Not Found' }, { status: 404, statusText: 'Not Found' },
    );
    expect(errorMsg).toContain('404');
  });

  // status 0 via proxy path (dev) — "proxy not running" guidance
  it('returns proxy-not-running message for status 0 when using dev proxy path', () => {
    service.setApiKey(KEY);
    // apiBase is '/fd-api/v4' (dev environment default — no override set)
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock
      .expectOne('/fd-api/v4/competitions')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    expect(errorMsg.toLowerCase()).toContain('red');     // "error de red"
    expect(errorMsg.toLowerCase()).toContain('proxy');   // actionable: proxy is the cause
    expect(errorMsg.toLowerCase()).not.toContain('cors');
  });

  // status 0 via direct URL (prod) — CORS guidance
  it('returns CORS guidance for status 0 when using a direct https URL', () => {
    service.setApiKey(KEY);
    service.setApiBase('https://api.football-data.org/v4'); // simulate prod environment
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock
      .expectOne('https://api.football-data.org/v4/competitions')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    expect(errorMsg.toLowerCase()).toContain('cors');    // CORS is the likely cause
    expect(errorMsg.toLowerCase()).toContain('proxy');   // suggest a reverse proxy as fix
  });

  it('listarCompeticiones no-key message guides developer to configure fdApiKey', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    // Key is now embedded in environment; message should point developer to the right file.
    expect(errorMsg.toLowerCase()).toContain('configura');
    expect(errorMsg).toContain('fdApiKey');
  });

  it('listarEquipos no-key message guides developer to check environment config', () => {
    let errorMsg = '';
    service.listarEquipos('PL').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    // Distinct from "no key at all" — signals the key is not available at request time.
    expect(errorMsg.toLowerCase()).toContain('disponible');
    expect(errorMsg).toContain('fdApiKey');
  });

  // ── listarPlantillaEquipo ────────────────────────

  it('listarPlantillaEquipo errors when no API key', () => {
    let errorMsg = '';
    service.listarPlantillaEquipo(57).subscribe({ error: (e: Error) => (errorMsg = e.message) });
    expect(errorMsg).toContain('disponible');
  });

  it('listarPlantillaEquipo calls correct URL with X-Auth-Token header', () => {
    service.setApiKey(KEY);
    const squad: FdJugadorSquad[] = [
      { id: 1, name: 'Bukayo Saka', position: 'Attacker', shirtNumber: 7 },
    ];
    let result: FdJugadorSquad[] = [];
    service.listarPlantillaEquipo(57).subscribe((s) => (result = s));

    const req = httpMock.expectOne('/fd-api/v4/teams/57');
    expect(req.request.headers.get('X-Auth-Token')).toBe(KEY);
    req.flush({ squad });
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Bukayo Saka');
  });

  it('listarPlantillaEquipo handles null squad response', () => {
    service.setApiKey(KEY);
    let result: FdJugadorSquad[] | null = null;
    service.listarPlantillaEquipo(57).subscribe((s) => (result = s));
    httpMock.expectOne('/fd-api/v4/teams/57').flush({ squad: null });
    expect(result).toEqual([]);
  });

  // ── listarPartidosEquipo ─────────────────────────

  it('listarPartidosEquipo errors when no API key', () => {
    let errorMsg = '';
    service.listarPartidosEquipo(57).subscribe({ error: (e: Error) => (errorMsg = e.message) });
    expect(errorMsg).toContain('disponible');
  });

  it('listarPartidosEquipo calls correct URL with status=FINISHED and limit param', () => {
    service.setApiKey(KEY);
    const matches: FdMatch[] = [
      {
        id: 1,
        utcDate: '2024-03-15T15:00:00Z',
        status: 'FINISHED',
        homeTeam: { id: 57, name: 'Arsenal FC', shortName: 'Arsenal' },
        awayTeam: { id: 64, name: 'Liverpool FC', shortName: 'Liverpool' },
        score: { fullTime: { home: 2, away: 1 } },
      },
    ];
    let result: FdMatch[] = [];
    service.listarPartidosEquipo(57).subscribe((m) => (result = m));

    const req = httpMock.expectOne(
      (r) => r.url === '/fd-api/v4/teams/57/matches',
    );
    expect(req.request.params.get('status')).toBe('FINISHED');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.headers.get('X-Auth-Token')).toBe(KEY);
    req.flush({ matches });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(1);
  });

  it('listarPartidosEquipo accepts custom limit', () => {
    service.setApiKey(KEY);
    service.listarPartidosEquipo(57, 5).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === '/fd-api/v4/teams/57/matches',
    );
    expect(req.request.params.get('limit')).toBe('5');
    req.flush({ matches: [] });
  });

  it('listarPartidosEquipo handles null matches response', () => {
    service.setApiKey(KEY);
    let result: FdMatch[] | null = null;
    service.listarPartidosEquipo(57).subscribe((m) => (result = m));
    httpMock.expectOne((r) => r.url === '/fd-api/v4/teams/57/matches').flush({ matches: null });
    expect(result).toEqual([]);
  });

  it('uses custom apiBase override when making requests', () => {
    service.setApiKey(KEY);
    service.setApiBase('https://custom-proxy.example.com/v4');

    let result: FdCompeticion[] = [];
    service.listarCompeticiones().subscribe((c) => (result = c));

    const req = httpMock.expectOne('https://custom-proxy.example.com/v4/competitions');
    expect(req.request.headers.get('X-Auth-Token')).toBe(KEY);
    req.flush({ competitions: [] });
    expect(result).toEqual([]);
  });
});
