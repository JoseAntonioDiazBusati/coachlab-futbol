import { Component, Input } from '@angular/core';
import { EstadisticaDetalle } from '../../../services/partido-registrado.service';

/**
 * Tabla presentacional (solo lectura) de las estadísticas por jugador de un
 * partido. Extraída de `RegistrarPartidoPageComponent` para reducir su tamaño
 * y poder reutilizarla/probarla de forma aislada.
 */
@Component({
  selector: 'app-partido-stats-tabla',
  standalone: true,
  imports: [],
  templateUrl: './partido-stats-tabla.component.html',
  styleUrl: './partido-stats-tabla.component.scss',
})
export class PartidoStatsTablaComponent {
  @Input() estadisticas: EstadisticaDetalle[] = [];

  trackByJugador(_: number, e: EstadisticaDetalle): number {
    return e.jugadorId;
  }
}
