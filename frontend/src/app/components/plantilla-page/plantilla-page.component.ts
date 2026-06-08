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
import { EquipoActivoService } from '../../services/equipo-activo.service';

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
  private readonly equipoActivo = inject(EquipoActivoService);
  private readonly route = inject(ActivatedRoute);

  equipos: Equipo[] = [];
  equipoSeleccionado: Equipo | null = null;
  jugadores: PlantillaJugador[] = [];
  cargando = false;
  guardando = false;
  error: string | null = null;
  exito: string | null = null;

  mostrarFormularioJugador = false;
  /** Marks the position select as invalid after a failed save attempt. */
  posicionInvalida = false;
  /** Set to true when arriving from a "new team" flow to auto-open the form. */
  private abrirFormularioAlCargar = false;

  nuevo: CrearJugadorPayload = this.limpiarFormularioJugador();

  posiciones = ['Portero', 'Defensa', 'Centrocampista', 'Delantero'];

  get porteros(): PlantillaJugador[] {
    return this.jugadores.filter((j) => j.posicion === 'Portero');
  }

  get jugadoresCampo(): PlantillaJugador[] {
    return this.jugadores.filter((j) => j.posicion !== 'Portero');
  }

  ngOnInit(): void {
    const equipoIdParam = this.route.snapshot.queryParamMap.get('equipoId');
    const equipoId = equipoIdParam ? Number(equipoIdParam) : null;
    // ?nuevo=true → auto-open the add-player form once the squad loads
    this.abrirFormularioAlCargar =
      this.route.snapshot.queryParamMap.get('nuevo') === 'true';
    this.cargarEquipos(equipoId);
  }

  cargarEquipos(seleccionarId: number | null = null): void {
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        const id = seleccionarId ?? this.equipoActivo.getId();
        const equipo =
          (id !== null ? equipos.find((e) => e.id === id) : null) ??
          equipos[0] ??
          null;
        if (equipo) {
          this.seleccionarEquipo(equipo);
        }
      },
      error: (err: Error) => {
        this.error =
          err?.message ?? 'No se pudieron cargar los equipos.';
      },
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    this.equipoSeleccionado = equipo;
    this.equipoActivo.setEquipo(equipo.id);
    this.error = null;
    this.cargarPlantilla();
  }

  seleccionarEquipoPorId(id: number): void {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const equipo = this.equipos.find((e) => e.id === numericId);
    if (equipo) this.seleccionarEquipo(equipo);
  }

  /**
   * Retry the last failed load without refreshing the page.
   * If a team is already selected, only reloads the squad.
   * Otherwise reloads the full team list.
   */
  reintentar(): void {
    this.error = null;
    if (this.equipoSeleccionado) {
      this.cargarPlantilla();
    } else {
      this.cargarEquipos();
    }
  }

  cargarPlantilla(): void {
    if (!this.equipoSeleccionado) return;
    this.cargando = true;
    this.error = null;
    this.jugadorService.listarPlantilla(this.equipoSeleccionado.id).subscribe({
      next: (data) => {
        this.jugadores = data;
        this.cargando = false;
        // Auto-open the form when arriving from a new-team flow
        if (this.abrirFormularioAlCargar) {
          this.abrirFormularioAlCargar = false;
          this.mostrarFormularioJugador = true;
        }
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'Error al cargar la plantilla.';
        this.cargando = false;
      },
    });
  }

  abrirFormularioJugador(): void {
    this.mostrarFormularioJugador = true;
    this.posicionInvalida = false;
    this.nuevo = this.limpiarFormularioJugador();
  }

  cerrarFormularioJugador(): void {
    this.mostrarFormularioJugador = false;
    this.posicionInvalida = false;
  }

  /** Called from the template when the user picks a position — clears the field error. */
  onPosicionChange(): void {
    this.posicionInvalida = false;
    this.error = null;
  }

  crearJugador(): void {
    if (!this.equipoSeleccionado || this.guardando) return;

    if (!this.nuevo.nombre.trim()) {
      this.error = 'El nombre del jugador es obligatorio.';
      return;
    }
    // Solo letras (con acentos), espacios y signos de nombres compuestos. Sin números.
    const soloLetras = /^[\p{L}][\p{L} .'\-]*$/u;
    if (!soloLetras.test(this.nuevo.nombre.trim())) {
      this.error = 'El nombre solo puede contener letras (sin números).';
      return;
    }
    if (this.nuevo.apellidos?.trim() && !/^[\p{L} .'\-]*$/u.test(this.nuevo.apellidos.trim())) {
      this.error = 'Los apellidos solo pueden contener letras (sin números).';
      return;
    }
    if (this.nuevo.dorsal != null && (this.nuevo.dorsal <= 0 || this.nuevo.dorsal > 99)) {
      this.error = 'El dorsal debe ser un número entre 1 y 99.';
      return;
    }
    if (this.nuevo.edad != null && this.nuevo.edad <= 0) {
      this.error = 'La edad debe ser un número positivo.';
      return;
    }
    if (!this.nuevo.posicion) {
      this.posicionInvalida = true;
      this.error = 'Selecciona una posición para el jugador.';
      return;
    }

    this.error = null;
    this.posicionInvalida = false;
    this.guardando = true;
    this.jugadorService.crear(this.equipoSeleccionado.id, this.nuevo).subscribe({
      next: () => {
        this.cerrarFormularioJugador();
        this.posicionInvalida = false;
        this.cargarPlantilla();
        this.exito = 'Jugador añadido correctamente.';
        setTimeout(() => (this.exito = null), 4000);
        this.guardando = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'Error al crear el jugador.';
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
        this.error = err?.message ?? 'Error al eliminar el jugador.';
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
