import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { of } from 'rxjs';
import { DashboardHeaderComponent } from './dashboard-header.component';
import { PerfilService, Perfil } from '../../../services/perfil.service';
import { AuthService } from '../../../services/auth.service';
import { EquipoActivoService } from '../../../services/equipo-activo.service';

const PERFIL_MOCK: Perfil = {
  id: 1,
  email: 'demo@coachlab.test',
  nombre: 'Demo User',
  fechaRegistro: '2024-01-15T00:00:00',
  totalEquipos: 1,
};

describe('DashboardHeaderComponent — modal de perfil', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await TestBed.configureTestingModule({
      imports: [DashboardHeaderComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        PerfilService,
        AuthService,
        EquipoActivoService,
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    expect(comp).toBeTruthy();
  });

  it('abrirPerfil() sets modalAbierto = true and loads perfil lazily', () => {
    const svc = TestBed.inject(PerfilService);
    vi.spyOn(svc, 'obtener').mockReturnValue(of(PERFIL_MOCK));

    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.abrirPerfil();

    expect(comp.modalAbierto).toBe(true);
    expect(svc.obtener).toHaveBeenCalledOnce();
    expect(comp.perfil?.nombre).toBe('Demo User');
  });

  it('abrirPerfil() does NOT call obtener() again if perfil already loaded', () => {
    const svc = TestBed.inject(PerfilService);
    const spy = vi.spyOn(svc, 'obtener').mockReturnValue(of(PERFIL_MOCK));

    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.abrirPerfil();
    comp.cerrarPerfil();
    comp.abrirPerfil();

    expect(spy).toHaveBeenCalledOnce();
  });

  it('cerrarPerfil() sets modalAbierto = false', () => {
    const svc = TestBed.inject(PerfilService);
    vi.spyOn(svc, 'obtener').mockReturnValue(of(PERFIL_MOCK));

    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.abrirPerfil();
    comp.cerrarPerfil();

    expect(comp.modalAbierto).toBe(false);
  });

  it('datosValidos is false when nombre is empty', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.datos = { nombre: '', email: 'demo@coachlab.test' };
    expect(comp.datosValidos).toBe(false);
  });

  it('datosValidos is true with valid nombre and email', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.datos = { nombre: 'Demo', email: 'demo@coachlab.test' };
    expect(comp.datosValidos).toBe(true);
  });

  it('passValido is false when nueva password is too short', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.pass = { actual: 'old', nueva: '12345', confirmacion: '12345' };
    expect(comp.passValido).toBe(false);
  });

  it('passValido is false when passwords do not match', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.pass = { actual: 'old', nueva: 'newpass1', confirmacion: 'newpass2' };
    expect(comp.passValido).toBe(false);
  });

  it('passValido is true when all conditions are met', () => {
    const comp = TestBed.createComponent(DashboardHeaderComponent).componentInstance;
    comp.pass = { actual: 'oldpass', nueva: 'newpass1', confirmacion: 'newpass1' };
    expect(comp.passValido).toBe(true);
  });
});
