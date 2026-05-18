import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { MatchCardComponent, MatchCardData, MatchResult } from './match-card/match-card.component';
import { PerformanceChartComponent, PerformancePoint } from './performance-chart/performance-chart.component';
import { TrendIndicatorComponent, TrendDirection } from './trend-indicator/trend-indicator.component';
import { EquipoService, Equipo, ResumenTemporada } from '../../services/equipo.service';
import { EquipoActivoService } from '../../services/equipo-activo.service';

interface KpiItem {
  title: string;
  value: string;
  helper: string;
  delta: number;
  deltaLabel: string;
}

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    FormsModule,
    DecimalPipe,
    DashboardHeaderComponent,
    KpiCardComponent,
    MatchCardComponent,
    PerformanceChartComponent,
    TrendIndicatorComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  @Input() showNavbar = true;
  @Input() embedded = false;

  private readonly equipoService = inject(EquipoService);
  private readonly equipoActivo = inject(EquipoActivoService);

  equipos: Equipo[] = [];
  equipoSeleccionado: Equipo | null = null;
  resumen: ResumenTemporada | null = null;
  cargando = false;
  error: string | null = null;

  teamName = 'CoachLab';
  season = 'Sin equipo seleccionado';
  nextMatch = '';

  trendSummary: { direction: TrendDirection; value: string; label: string } = {
    direction: 'neutral',
    value: '0%',
    label: 'Cargando...',
  };

  kpis: KpiItem[] = [];

  performancePoints: PerformancePoint[] = [
    { label: 'Ene', value: 0 },
    { label: 'Feb', value: 0 },
    { label: 'Mar', value: 0 },
    { label: 'Abr', value: 0 },
    { label: 'May', value: 0 },
    { label: 'Jun', value: 0 },
    { label: 'Jul', value: 0 },
    { label: 'Ago', value: 0 },
    { label: 'Sep', value: 0 },
    { label: 'Oct', value: 0 },
    { label: 'Nov', value: 0 },
    { label: 'Dic', value: 0 },
  ];

  recentMatches: MatchCardData[] = [];

  ngOnInit(): void {
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.cargando = true;
    this.error = null;
    this.equipoService.listar().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        const activoId = this.equipoActivo.getId();
        const equipo =
          equipos.find((e) => e.id === activoId) ?? equipos[0] ?? null;
        if (equipo) {
          this.seleccionarEquipo(equipo);
        } else {
          this.cargando = false;
        }
      },
      error: () => {
        this.error = 'No se pudieron cargar los equipos.';
        this.cargando = false;
      },
    });
  }

  seleccionarEquipo(equipo: Equipo): void {
    this.equipoSeleccionado = equipo;
    this.equipoActivo.setEquipo(equipo.id);
    this.error = null;
    this.cargarResumen();
  }

  seleccionarEquipoPorId(id: string | number): void {
    const numericId = typeof id === 'string' ? Number(id) : id;
    const equipo = this.equipos.find((e) => e.id === numericId);
    if (equipo) this.seleccionarEquipo(equipo);
  }

  cargarResumen(): void {
    if (!this.equipoSeleccionado) return;
    this.cargando = true;
    this.error = null;
    this.equipoService.getResumen(this.equipoSeleccionado.id).subscribe({
      next: (resumen) => {
        this.resumen = resumen;
        this.aplicarResumen(resumen);
        this.cargando = false;
      },
      error: () => {
        this.error = 'Error al cargar el resumen del equipo.';
        this.cargando = false;
      },
    });
  }

  private aplicarResumen(r: ResumenTemporada): void {
    const eq = this.equipoSeleccionado!;
    this.teamName = eq.nombre;
    this.season = `${eq.categoria || 'Sin categoría'} · ${eq.temporada || 'Temporada actual'}`;

    const golesPorPartido =
      r.totalPartidos > 0 ? Math.round((r.totalGolesAFavor / r.totalPartidos) * 10) / 10 : 0;
    const golesContraPorPartido =
      r.totalPartidos > 0
        ? Math.round((r.totalGolesEnContra / r.totalPartidos) * 10) / 10
        : 0;
    const difGoles =
      r.totalPartidos > 0 ? r.totalGolesAFavor - r.totalGolesEnContra : 0;

    const deltaIre = r.ire > 50 ? 2 : r.ire > 30 ? -1 : -3;
    this.trendSummary = {
      direction: deltaIre >= 0 ? 'up' : 'down',
      value: `${Math.round(r.ire)}%`,
      label: 'Índice compuesto',
    };

    this.kpis = [
      {
        title: 'Victorias',
        value: `${r.victorias}`,
        helper: r.rachaReciente.length > 0 ? r.rachaReciente.slice(0, 3).join(' - ') : 'En temporada',
        delta: r.totalPartidos > 0 ? Math.round((r.victorias / r.totalPartidos) * 100) : 0,
        deltaLabel: '% total',
      },
      {
        title: 'Derrotas',
        value: `${r.derrotas}`,
        helper: 'Controlado',
        delta: -r.derrotas,
        deltaLabel: 'en temporada',
      },
      {
        title: 'Partidos jugados',
        value: `${r.totalPartidos}`,
        helper: 'Ritmo sostenido',
        delta: r.totalPartidos,
        deltaLabel: 'en temporada',
      },
      {
        title: 'Goles por partido',
        value: `${golesPorPartido}`,
        helper: 'Ataque eficiente',
        delta: golesPorPartido >= 1 ? 0.2 : -0.1,
        deltaLabel: 'último mes',
      },
      {
        title: 'Goles en contra por partido',
        value: `${golesContraPorPartido}`,
        helper: 'Solidez defensiva',
        delta: golesContraPorPartido <= 1 ? -0.1 : 0.3,
        deltaLabel: 'último mes',
      },
      {
        title: 'IRE del equipo',
        value: `${Math.round(r.ire)}`,
        helper: 'Índice global',
        delta: deltaIre,
        deltaLabel: 'último mes',
      },
    ];

    this.nextMatch =
      r.totalPartidos > 0
        ? `${difGoles >= 0 ? '+' : ''}${difGoles} diferencia de goles`
        : 'Sin partidos registrados';

    this.performancePoints = this.generarPuntosEvolucion(r);
    this.recentMatches = this.generarUltimosPartidos(r);
  }

  private generarPuntosEvolucion(r: ResumenTemporada): PerformancePoint[] {
    const base = Math.max(0, Math.min(100, Math.round(r.ire)));
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
    ];
    const now = new Date().getMonth();
    return months.map((label, i) => {
      const progress = Math.min(1, (i + 1) / (now + 1));
      const value = Math.round(base * progress * 0.8 + base * 0.2);
      return { label, value };
    });
  }

  private generarUltimosPartidos(r: ResumenTemporada): MatchCardData[] {
    if (!r.rachaReciente || r.rachaReciente.length === 0) {
      return [];
    }
    const resultMap: Record<string, MatchResult> = {
      VICTORIA: 'V',
      EMPATE: 'E',
      DERROTA: 'D',
    };
    return r.rachaReciente.map((resultado, i) => ({
      opponent: `Partido ${i + 1}`,
      date: '—',
      venue: i % 2 === 0 ? 'Local' : 'Visitante',
      score: '—',
      result: resultMap[resultado] ?? 'E',
    }));
  }
}
