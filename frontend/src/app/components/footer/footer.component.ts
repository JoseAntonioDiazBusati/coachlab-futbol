import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  currentYear = new Date().getFullYear();

  columns: FooterColumn[] = [
    {
      title: 'Producto',
      links: [
        { label: 'Funcionalidades', href: '#' },
        { label: 'Changelog', href: '#' },
        { label: 'Roadmap', href: '#' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { label: 'Documentación', href: '#' },
        { label: 'Blog táctico', href: '#' },
        { label: 'API', href: '#' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Sobre el proyecto', href: '#' },
        { label: 'Contacto', href: '#' },
        { label: 'Contribuir', href: '#' },
      ],
    },
  ];

  legalLinks: FooterLink[] = [
    { label: 'Privacidad', href: '#' },
    { label: 'Términos', href: '#' },
    { label: 'Cookies', href: '#' },
  ];
}

