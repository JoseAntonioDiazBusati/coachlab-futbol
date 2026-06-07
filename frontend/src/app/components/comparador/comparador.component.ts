import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExplorarService, EquipoComparacion } from '../../services/explorar.service';
import { PlantillaJugador } from '../../services/jugador.service';

/**
 * Comparador de plantillas de equipos de la aplicación (solo lectura).
 *
 * Permite a entrenadores y ojeadores seleccionar dos equipos y comparar sus
 * plantillas/alineaciones lado a lado. Carga los datos del backend al
 * inicializarse; se monta solo cuando el contenedor lo muestra.
 */
@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './comparador.component.html',
  styleUrl: './comparador.component.scss',
})
export class ComparadorComponent implements OnInit {
  private readonly explorar = inject(ExplorarService);

  equipos: EquipoComparacion[] = [];
  cargandoEquipos = false;
  error: string | null = null;

  equipoAId: number | null = null;
  equipoBId: number | null = null;
  plantillaA: PlantillaJugador[] = [];
  plantillaB: PlantillaJugador[] = [];
  cargandoA = false;
  cargandoB = false;

  ngOnInit(): void {
    this.cargandoEquipos = true;
    this.explorar.listarEquipos().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        this.cargandoEquipos = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudieron cargar los equipos.';
        this.cargandoEquipos = false;
      },
    });
  }

  nombreEquipo(id: number | null): string {
    return this.equipos.find((e) => e.id === id)?.nombre ?? '';
  }

  cambiarA(): void {
    this.cargarPlantilla('A');
  }

  cambiarB(): void {
    this.cargarPlantilla('B');
  }

  private cargarPlantilla(lado: 'A' | 'B'): void {
    const id = lado === 'A' ? this.equipoAId : this.equipoBId;
    if (id === null) {
      if (lado === 'A') this.plantillaA = [];
      else this.plantillaB = [];
      return;
    }
    if (lado === 'A') this.cargandoA = true;
    else this.cargandoB = true;

    this.explorar.plantilla(id).subscribe({
      next: (jugadores) => {
        const ordenada = [...jugadores].sort((a, b) => b.impacto - a.impacto);
        if (lado === 'A') {
          this.plantillaA = ordenada;
          this.cargandoA = false;
        } else {
          this.plantillaB = ordenada;
          this.cargandoB = false;
        }
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar la plantilla.';
        if (lado === 'A') this.cargandoA = false;
        else this.cargandoB = false;
      },
    });
  }

  totalImpacto(plantilla: PlantillaJugador[]): number {
    return Math.round(plantilla.reduce((sum, j) => sum + (j.impacto ?? 0), 0) * 10) / 10;
  }

  totalGoles(plantilla: PlantillaJugador[]): number {
    return plantilla.reduce((sum, j) => sum + (j.goles ?? 0), 0);
  }

  trackByJugador(_: number, j: PlantillaJugador): number {
    return j.jugadorId;
  }
}
