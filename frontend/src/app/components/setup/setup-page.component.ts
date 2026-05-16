import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  FootballDataService,
  FdCompeticion,
  FdEquipo,
} from '../../services/football-data.service';
import { EquipoService } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';

type Paso = 'metodo' | 'api-key' | 'api-ligas' | 'api-equipos' | 'manual';

interface EquipoManual {
  nombre: string;
  categoria: string;
  temporada: string;
  ciudad: string;
}

@Component({
  selector: 'app-setup-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './setup-page.component.html',
  styleUrl: './setup-page.component.scss',
})
export class SetupPageComponent {
  private readonly router = inject(Router);
  private readonly fdService = inject(FootballDataService);
  private readonly equipoService = inject(EquipoService);
  private readonly equipoActivo = inject(EquipoActivoService);

  paso: Paso = 'metodo';
  cargando = false;
  error: string | null = null;

  apiKey = this.fdService.getApiKey() ?? '';

  competiciones: FdCompeticion[] = [];
  competicionSeleccionada: FdCompeticion | null = null;

  equiposApi: FdEquipo[] = [];
  equipoApiSeleccionado: FdEquipo | null = null;

  equipoManual: EquipoManual = {
    nombre: '',
    categoria: '',
    temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
    ciudad: '',
  };

  elegirMetodo(metodo: 'api' | 'manual'): void {
    this.error = null;
    this.paso = metodo === 'api' ? 'api-key' : 'manual';
  }

  cargarCompeticiones(): void {
    if (!this.apiKey.trim()) {
      this.error = 'Introduce una API key válida.';
      return;
    }
    this.fdService.setApiKey(this.apiKey);
    this.cargando = true;
    this.error = null;
    this.fdService.listarCompeticiones().subscribe({
      next: (comps) => {
        this.competiciones = comps;
        this.cargando = false;
        this.paso = 'api-ligas';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.cargando = false;
      },
    });
  }

  seleccionarCompeticion(comp: FdCompeticion): void {
    this.competicionSeleccionada = comp;
    this.cargando = true;
    this.error = null;
    this.fdService.listarEquipos(comp.code).subscribe({
      next: (equipos) => {
        this.equiposApi = equipos;
        this.equipoApiSeleccionado = null;
        this.cargando = false;
        this.paso = 'api-equipos';
      },
      error: (err: Error) => {
        this.error = err.message;
        this.cargando = false;
      },
    });
  }

  confirmarEquipoApi(): void {
    if (!this.equipoApiSeleccionado) {
      this.error = 'Selecciona un equipo primero.';
      return;
    }
    const fd = this.equipoApiSeleccionado;
    this.cargando = true;
    this.error = null;
    this.equipoService
      .crear({
        nombre: fd.name,
        categoria: this.competicionSeleccionada?.name,
        temporada: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
        ciudad: fd.area?.name,
      })
      .subscribe({
        next: (equipo) => {
          this.equipoActivo.setEquipo(equipo.id);
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.error = err.message;
          this.cargando = false;
        },
      });
  }

  crearEquipoManual(): void {
    if (!this.equipoManual.nombre.trim()) {
      this.error = 'El nombre del equipo es obligatorio.';
      return;
    }
    this.cargando = true;
    this.error = null;
    this.equipoService
      .crear({
        nombre: this.equipoManual.nombre.trim(),
        categoria: this.equipoManual.categoria.trim() || undefined,
        temporada: this.equipoManual.temporada.trim() || undefined,
        ciudad: this.equipoManual.ciudad.trim() || undefined,
      })
      .subscribe({
        next: (equipo) => {
          this.equipoActivo.setEquipo(equipo.id);
          this.router.navigate(['/dashboard']);
        },
        error: (err: Error) => {
          this.error = err.message;
          this.cargando = false;
        },
      });
  }

  volver(): void {
    this.error = null;
    const prevPaso: Record<Paso, Paso> = {
      'metodo': 'metodo',
      'api-key': 'metodo',
      'api-ligas': 'api-key',
      'api-equipos': 'api-ligas',
      'manual': 'metodo',
    };
    this.paso = prevPaso[this.paso];
  }
}
