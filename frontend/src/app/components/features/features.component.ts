import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Feature {
  icon: string;
  title: string;
  description: string;
  tag: string;
}

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features.component.html',
  styleUrl: './features.component.scss',
})
export class FeaturesComponent {
  private readonly sanitizer = inject(DomSanitizer);
  features: Feature[] = [
    {
      icon: 'check',
      title: 'Índice IRE',
      description:
        'Un número que resume el estado real de tu equipo: resultados recientes, goles a favor, en contra y diferencia. De un vistazo, sabes cómo estás.',
      tag: 'Diferenciador clave',
    },
    {
      icon: 'chart',
      title: 'Dashboard analítico',
      description:
        'Gráficos de evolución del rendimiento, distribución de goles y comparativas entre jugadores. Todo actualizado tras cada partido registrado.',
      tag: '',
    },
    {
      icon: 'network',
      title: 'Ranking de impacto',
      description:
        'Goles, asistencias, minutos y tarjetas se combinan en un indicador ponderado por jugador. Sabes quién aporta de verdad y quién necesita más atención.',
      tag: '',
    },
    {
      icon: 'document',
      title: 'Registro de partidos',
      description:
        'Captura fecha, rival, condición (local/visitante) y resultado. Por jugador: goles, asistencias, minutos y tarjetas. La base de todo el análisis.',
      tag: '',
    },
    {
      icon: 'trend',
      title: 'Panel pre-partido',
      description:
        'Antes de cada encuentro, consulta la racha reciente, el balance ofensivo/defensivo y una predicción orientativa basada en el rendimiento de ambos equipos.',
      tag: '',
    },
    {
      icon: 'globe',
      title: 'Datos de competición',
      description:
        'Integración con Football-Data.org para consultar clasificaciones y calendarios actualizados. Sin salir de la aplicación.',
      tag: '',
    },
  ];

  getIcon(iconName: string): SafeHtml {
    const icons: { [key: string]: string } = {
      check: `<circle cx="11" cy="11" r="9" stroke="#10B981" stroke-width="1.5"/>
              <path d="M7 11 L10 14 L15 8" stroke="#10B981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
      chart: `<rect x="2" y="13" width="4" height="8" rx="1" fill="#10B981"/>
              <rect x="9" y="8" width="4" height="13" rx="1" fill="#10B981" opacity="0.65"/>
              <rect x="16" y="4" width="4" height="17" rx="1" fill="#10B981" opacity="0.4"/>
              <path d="M3 11 L10 6 L17 2" stroke="#00E676" stroke-width="1.5" stroke-linecap="round"/>`,
      network: `<circle cx="7" cy="7" r="3" stroke="#10B981" stroke-width="1.5"/>
                <circle cx="15" cy="7" r="3" stroke="#10B981" stroke-width="1.5"/>
                <circle cx="11" cy="15" r="3" stroke="#10B981" stroke-width="1.5"/>
                <line x1="7" y1="10" x2="9.5" y2="12.5" stroke="#10B981" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>
                <line x1="15" y1="10" x2="12.5" y2="12.5" stroke="#10B981" stroke-width="1.2" stroke-dasharray="1.5 1.5"/>`,
      document: `<rect x="3" y="2" width="16" height="18" rx="2" stroke="#10B981" stroke-width="1.5"/>
                 <line x1="7" y1="8" x2="15" y2="8" stroke="#10B981" stroke-width="1" stroke-linecap="round"/>
                 <line x1="7" y1="12" x2="13" y2="12" stroke="#10B981" stroke-width="1" stroke-linecap="round"/>
                 <line x1="7" y1="16" x2="11" y2="16" stroke="#10B981" stroke-width="1" stroke-linecap="round"/>`,
      trend: `<path d="M3 12 L7 8 L11 13 L15 6 L19 10" stroke="#10B981" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="3" y1="18" x2="19" y2="18" stroke="#10B981" stroke-width="1" stroke-linecap="round" opacity="0.5"/>`,
      globe: `<ellipse cx="11" cy="11" rx="8" ry="8" stroke="#10B981" stroke-width="1.5"/>
              <line x1="11" y1="3" x2="11" y2="19" stroke="#10B981" stroke-width="1"/>
              <line x1="3" y1="11" x2="19" y2="11" stroke="#10B981" stroke-width="1"/>
              <path d="M5 6 Q11 9 17 6" stroke="#10B981" stroke-width="0.8" stroke-dasharray="2 2"/>
              <path d="M5 16 Q11 13 17 16" stroke="#10B981" stroke-width="0.8" stroke-dasharray="2 2"/>`,
    };
    const raw = icons[iconName] ?? icons['check'];
    return this.sanitizer.bypassSecurityTrustHtml(raw);
  }
}

