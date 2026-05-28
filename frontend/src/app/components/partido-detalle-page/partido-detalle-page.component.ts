import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { EquipoService, Equipo } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';
import {
  PartidoRegistradoService,
  PartidoDetalle,
} from '../../services/partido-registrado.service';

/**
 * Vista de detalle de un partido: cabecera (rival, fecha, marcador, competición,
 * origen) y tabla de estadísticas por jugador (solo lectura).
 *
 * Ruta: `/partidos/:id`. El equipo se resuelve desde el equipo activo (o el
 * primero del usuario como fallback).
 */
@Component({
  selector: 'app-partido-detalle-page',
  standalone: true,
  imports: [RouterLink, DashboardHeaderComponent],
  templateUrl: './partido-detalle-page.component.html',
  styleUrl: './partido-detalle-page.component.scss',
})
export class PartidoDetallePageComponent implements OnInit {
  private readonly route        = inject(ActivatedRoute);
  private readonly equipoService = inject(EquipoService);
  private readonly equipoActivo  = inject(EquipoActivoService);
  private readonly partidoService = inject(PartidoRegistradoService);

  equipo: Equipo | null = null;
  partido: PartidoDetalle | null = null;
  cargando = false;
  error: string | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const partidoId = idParam ? Number(idParam) : NaN;
    if (Number.isNaN(partidoId)) {
      this.error = 'Partido no válido.';
      return;
    }
    this.cargar(partidoId);
  }

  cargar(partidoId: number): void {
    this.cargando = true;
    this.error = null;
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        const activoId = this.equipoActivo.getId();
        this.equipo =
          (activoId !== null ? equipos.find((e) => e.id === activoId) : null) ??
          equipos[0] ??
          null;
        if (!this.equipo) {
          this.error = 'No tienes ningún equipo.';
          this.cargando = false;
          return;
        }
        this.partidoService.obtenerDetalle(this.equipo.id, partidoId).subscribe({
          next: (p) => { this.partido = p; this.cargando = false; },
          error: (err: Error) => {
            this.error = err?.message ?? 'No se pudo cargar el partido.';
            this.cargando = false;
          },
        });
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudo cargar el equipo.';
        this.cargando = false;
      },
    });
  }

  // ── Helpers de presentación ───────────────────────
  get golesNuestros(): number { return this.partido?.golesAFavor ?? 0; }
  get golesRivales(): number  { return this.partido?.golesEnContra ?? 0; }

  resultadoClass(r: string | null): string {
    return r === 'VICTORIA' ? 'win' : r === 'DERROTA' ? 'loss' : 'draw';
  }

  resultadoLabel(r: string | null): string {
    return r === 'VICTORIA' ? 'Victoria' : r === 'DERROTA' ? 'Derrota' : 'Empate';
  }

  condicionLabel(esLocal: boolean): string {
    return esLocal ? 'Local' : 'Visitante';
  }

  fechaFormateada(fecha: string): string {
    if (!fecha) return '';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }
}
