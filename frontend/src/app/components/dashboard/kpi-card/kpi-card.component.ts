import { Component, Input } from '@angular/core';
import { TrendDirection, TrendIndicatorComponent } from '../trend-indicator/trend-indicator.component';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [TrendIndicatorComponent],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
})
export class KpiCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input() helper = '';
  @Input() deltaLabel = '';

  trend: TrendDirection = 'neutral';
  deltaDisplay = '0';

  @Input()
  set delta(value: number) {
    this.trend = value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
    this.deltaDisplay = `${Math.abs(value)}`;
  }
}

