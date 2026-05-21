import { Component, Input } from '@angular/core';

export type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
  selector: 'app-trend-indicator',
  standalone: true,
  templateUrl: './trend-indicator.component.html',
  styleUrl: './trend-indicator.component.scss',
})
export class TrendIndicatorComponent {
  @Input({ required: true }) value = '';
  @Input() label = '';

  private _direction: TrendDirection = 'neutral';
  icon = '-';

  @Input()
  set direction(value: TrendDirection) {
    this._direction = value;
    this.icon = value === 'up' ? '^' : value === 'down' ? 'v' : '-';
  }

  get direction() {
    return this._direction;
  }
}
