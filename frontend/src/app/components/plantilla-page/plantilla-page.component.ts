import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import {
  JugadorService,
  PlantillaJugador,
  CrearJugadorPayload,
} from '../../services/jugador.service';
import { EquipoService, Equipo, CrearEquipoPayload } from '../../services/equipo.service';

@Component({
  selector: 'app-plantilla-page',
  standalone: true,
  imports: [FormsModule, DashboardHeaderComponent],
  templateUrl: './plantilla-page.component.html',
  styleUrl: './plantilla-page.component.scss',
})
export class PlantillaPageComponent implements OnInit {
  private readonly jugadorService = inject(JugadorService);
  private readonly equipoService = inject(EquipoService);

  equipos: Equipo[] = [];
  equipoSeleccionado: Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  cargando = false;
  error: string | null = null;
  exito: string | null = null;

  mostrarFormularioJugador = false;
  mostrarFormularioEquipo = false;

  nuevo: CrearJugadorPayload = this.limpiarFormularioJugador();
  nuevoEquipo: CrearEquipoPayload = { nombre: '', categoria: '', temporada: '' };

  posiciones = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        if (equipos.length > 0 && !this.equipoSeleccionado) {
          this.seleccionarEquipo(equipos[0]);
        }
      },
      error: () => {
        this.error = 'No se pudieron cargar los equipos. ¿Está el backend en marcha?';
      },
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    this.equipoSeleccionado = equipo;
    this.error = null;
    this.cargarPlantilla();
  }

  seleccionarEquipoPorId(id: number): void {
    const equipo = this.equipos.find((e) => e.id === id);
    if (equipo) this.seleccionarEquipo(equipo);
  }

  cargarPlantilla(): void {
    if (!this.equipoSeleccionado) return;
    this.cargando = true;
    this.error = null;
    this.jugadorService.listarPlantilla(this.equipoSeleccionado.id).subscribe({
      next: (data) => {
        this.jugadores = data;
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar la plantilla. Verifica la conexión con el backend.';
        this.cargando = false;
      },
    });
  }

  abrirFormularioEquipo(): void {
    this.mostrarFormularioEquipo = true;
    this.nuevoEquipo = { nombre: '', categoria: '', temporada: '' };
  }

  cerrarFormularioEquipo(): void {
    this.mostrarFormularioEquipo = false;
  }

  crearEquipo(): void {
    if (!this.nuevoEquipo.nombre.trim()) return;
    this.equipoService.crear(this.nuevoEquipo).subscribe({
      next: (equipo) => {
        this.cerrarFormularioEquipo();
        this.cargarEquipos();
        this.exito = `Equipo "${equipo.nombre}" creado correctamente.`;
        setTimeout(() => (this.exito = null), 4000);
      },
      error: () => {
        this.error = 'Error al crear el equipo.';
      },
    });
  }

  abrirFormularioJugador(): void {
    this.mostrarFormularioJugador = true;
    this.nuevo = this.limpiarFormularioJugador();
  }

  cerrarFormularioJugador(): void {
    this.mostrarFormularioJugador = false;
  }

  crearJugador(): void {
    if (!this.nuevo.nombre.trim() || !this.equipoSeleccionado) return;
    this.error = null;
    this.jugadorService.crear(this.equipoSeleccionado.id, this.nuevo).subscribe({
      next: () => {
        this.cerrarFormularioJugador();
        this.cargarPlantilla();
        this.exito = 'Jugador añadido correctamente.';
        setTimeout(() => (this.exito = null), 4000);
      },
      error: () => {
        this.error = 'Error al crear el jugador. Verifica que el backend esté en marcha.';
      },
    });
  }

  eliminarJugador(id: number): void {
    if (!this.equipoSeleccionado) return;
    this.error = null;
    this.jugadorService.eliminar(this.equipoSeleccionado.id, id).subscribe({
      next: () => {
        this.cargarPlantilla();
        this.exito = 'Jugador eliminado.';
        setTimeout(() => (this.exito = null), 4000);
      },
      error: () => {
        this.error = 'Error al eliminar el jugador.';
      },
    });
  }

  private limpiarFormularioJugador(): CrearJugadorPayload {
    return {
      nombre: '',
      apellidos: '',
      dorsal: undefined,
      posicion: '',
      edad: undefined,
    };
  }
}
