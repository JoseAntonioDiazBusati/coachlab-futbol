import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FootballDataService, FdCompeticion, FdEquipo } from './football-data.service';

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

  it('returns network/CORS message for status 0', () => {
    service.setApiKey(KEY);
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    httpMock
      .expectOne('/fd-api/v4/competitions')
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    expect(errorMsg.toLowerCase()).toContain('red');
  });

  it('listarCompeticiones no-key message includes actionable guidance', () => {
    let errorMsg = '';
    service.listarCompeticiones().subscribe({ error: (e: Error) => (errorMsg = e.message) });
    // Should tell the user what to do, not just state the problem
    expect(errorMsg.toLowerCase()).toContain('configura');
  });

  it('listarEquipos no-key message signals the key disappeared mid-session', () => {
    let errorMsg = '';
    service.listarEquipos('PL').subscribe({ error: (e: Error) => (errorMsg = e.message) });
    // Distinct from "no key at all" — signals that the key was lost after the flow started
    expect(errorMsg.toLowerCase()).toContain('disponible');
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
