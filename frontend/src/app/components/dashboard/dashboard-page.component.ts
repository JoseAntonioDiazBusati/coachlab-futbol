import { Component, Input } from '@angular/core';
import { DashboardHeaderComponent } from './dashboard-header/dashboard-header.component';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { MatchCardComponent, MatchCardData } from './match-card/match-card.component';
import { PerformanceChartComponent, PerformancePoint } from './performance-chart/performance-chart.component';
import { TrendIndicatorComponent } from './trend-indicator/trend-indicator.component';

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
    DashboardHeaderComponent,
    KpiCardComponent,
    MatchCardComponent,
    PerformanceChartComponent,
    TrendIndicatorComponent,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  @Input() showNavbar = true;
  @Input() embedded = false;

  teamName = 'CD Atletico Rota';
  season = 'Temporada 2025/26 - Liga Provincial Grupo B';
  nextMatch = 'Proximo rival: UD Trebujena - Sabado 18:00';

  trendSummary = {
    direction: 'up' as const,
    value: '8%',
    label: 'vs ultimo trimestre',
  };

  kpis: KpiItem[] = [
    { title: 'Victorias', value: '12', helper: 'Racha positiva', delta: 2, deltaLabel: 'ultimo mes' },
    { title: 'Derrotas', value: '3', helper: 'Controlado', delta: -1, deltaLabel: 'ultimo mes' },
    { title: 'Partidos jugados', value: '18', helper: 'Ritmo sostenido', delta: 3, deltaLabel: 'ultimo mes' },
    { title: 'Goles por partido', value: '2.1', helper: 'Ataque eficiente', delta: 0.2, deltaLabel: 'ultimo mes' },
    { title: 'Goles en contra por partido', value: '0.9', helper: 'Solidez defensiva', delta: -0.1, deltaLabel: 'ultimo mes' },
    { title: 'IRE del equipo', value: '73', helper: 'Indice global', delta: 4, deltaLabel: 'ultimo mes' },
  ];

  performancePoints: PerformancePoint[] = [
    { label: 'Ene', value: 48 },
    { label: 'Feb', value: 52 },
    { label: 'Mar', value: 58 },
    { label: 'Abr', value: 60 },
    { label: 'May', value: 64 },
    { label: 'Jun', value: 68 },
    { label: 'Jul', value: 62 },
    { label: 'Ago', value: 70 },
    { label: 'Sep', value: 74 },
    { label: 'Oct', value: 78 },
    { label: 'Nov', value: 82 },
    { label: 'Dic', value: 76 },
  ];

  recentMatches: MatchCardData[] = [
    { opponent: 'UD Trebujena', date: '07 MAY', venue: 'Local', score: '2 - 1', result: 'V' },
    { opponent: 'CD Rota B', date: '30 ABR', venue: 'Visitante', score: '1 - 1', result: 'E' },
    { opponent: 'Atletico Sanluqueno', date: '23 ABR', venue: 'Local', score: '0 - 2', result: 'D' },
    { opponent: 'Xerez Deportivo', date: '16 ABR', venue: 'Visitante', score: '3 - 0', result: 'V' },
  ];
}
