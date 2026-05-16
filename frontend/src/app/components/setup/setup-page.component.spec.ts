import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { SetupPageComponent } from './setup-page.component';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import { EquipoService } from '../../services/equipo.service';
import { FootballDataService } from '../../services/football-data.service';

describe('SetupPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SetupPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        EquipoService,
        EquipoActivoService,
        FootballDataService,
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should start on metodo step', () => {
    const fixture = TestBed.createComponent(SetupPageComponent);
    expect(fixture.componentInstance.paso).toBe('metodo');
  });

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
});
