import { Component } from '@angular/core';
import { DashboardHeaderComponent } from '../dashboard/dashboard-header/dashboard-header.component';
import { COLORS } from '../../design/colors';

@Component({
  selector: 'app-liga-page',
  standalone: true,
  imports: [DashboardHeaderComponent],
  templateUrl: './liga-page.component.html',
  styleUrl: './liga-page.component.scss',
})
export class LigaPageComponent {
  colors = COLORS;
}
