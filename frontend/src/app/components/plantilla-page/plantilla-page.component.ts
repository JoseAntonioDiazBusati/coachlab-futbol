import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import {
  JugadorService,
  PlantillaJugador,
  CrearJugadorPayload,
} from '../../services/jugador.service';
import { EquipoService, Equipo } from '../../services/equipo.service';

@Component({
  selector: 'app-plantilla-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DashboardHeaderComponent],
  templateUrl: './plantilla-page.component.html',
  styleUrl: './plantilla-page.component.scss',
})
export class PlantillaPageComponent implements OnInit {
  private readonly jugadorService = inject(JugadorService);
  private readonly equipoService = inject(EquipoService);
  private readonly route = inject(ActivatedRoute);

  equipos: Equipo[] = [];
  equipoSeleccionado: Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  cargando = false;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;

  mostrarFormularioJugador = false;

  nuevo: CrearJugadorPayload = this.limpiarFormularioJugador();

  posiciones = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

  ngOnInit(): void {
    const equipoIdParam = this.route.snapshot.queryParamMap.get('equipoId');
    const equipoId = equipoIdParam ? Number(equipoIdParam) : null;
    this.cargarEquipos(equipoId);
  }

  cargarEquipos(seleccionarId: number | null = null): void {
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        if (seleccionarId !== null) {
          const equipo = equipos.find((e) => e.id === seleccionarId);
          if (equipo) this.seleccionarEquipo(equipo);
          else if (equipos.length > 0 && !this.equipoSeleccionado) {
            this.seleccionarEquipo(equipos[0]);
          }
        } else if (equipos.length > 0 && !this.equipoSeleccionado) {
          this.seleccionarEquipo(equipos[0]);
        }
      },
      error: (err: Error) => {
        this.error = err?.message || 'No se pudieron cargar los equipos. ¿Está el backend en marcha?';
      },
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    this.equipoSeleccionado = equipo;
    this.error = null;
    this.cargarPlantilla();
  }

  seleccionarEquipoPorId(id: number): void {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const equipo = this.equipos.find((e) => e.id === numericId);
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
      error: (err: Error) => {
        this.error = err?.message || 'Error al cargar la plantilla. Verifica la conexión con el backend.';
        this.cargando = false;
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
    if (!this.nuevo.nombre.trim() || !this.equipoSeleccionado || this.guardando) return;
    this.error = null;
    this.guardando = true;
    this.jugadorService.crear(this.equipoSeleccionado.id, this.nuevo).subscribe({
      next: () => {
        this.cerrarFormularioJugador();
        this.cargarPlantilla();
        this.exito = 'Jugador añadido correctamente.';
        setTimeout(() => (this.exito = null), 4000);
        this.guardando = false;
      },
      error: (err: Error) => {
        this.error = err?.message || 'Error al crear el jugador. Verifica que el backend esté en marcha.';
        this.guardando = false;
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
      error: (err: Error) => {
        this.error = err?.message || 'Error al eliminar el jugador.';
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
