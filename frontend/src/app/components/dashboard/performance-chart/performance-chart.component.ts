import { Component, Input } from '@angular/core';

export interface PerformancePoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-performance-chart',
  standalone: true,
  templateUrl: './performance-chart.component.html',
  styleUrl: './performance-chart.component.scss',
})
export class PerformanceChartComponent {
  @Input({ required: true }) points: PerformancePoint[] = [];
}

export {};
