import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExplorarService, EquipoComparacion } from '../../services/explorar.service';
import { PlantillaJugador } from '../../services/jugador.service';
import { FootballDataService, FdCompeticion, FdEquipo } from '../../services/football-data.service';
import { mapFdPosicion, splitNombre } from '../liga-page/liga-page.utils';

type Fuente = 'app' | 'api';

/** Estado de uno de los dos lados a comparar. */
interface Lado {
  fuente: Fuente;
  equipoAppId: number | null;        // origen app
  competicionCode: string | null;    // origen api
  equiposApi: FdEquipo[];
  cargandoEquiposApi: boolean;
  equipoApiId: number | null;
  nombre: string;
  plantilla: PlantillaJugador[];
  cargando: boolean;
}

function nuevoLado(): Lado {
  return {
    fuente: 'app',
    equipoAppId: null,
    competicionCode: null,
    equiposApi: [],
    cargandoEquiposApi: false,
    equipoApiId: null,
    nombre: '',
    plantilla: [],
    cargando: false,
  };
}

/**
 * Comparador de plantillas (rol OJEADOR). Permite comparar dos equipos lado a
 * lado, eligiendo cada uno entre los equipos de la aplicación o equipos de
 * football-data.org (API). Solo lectura.
 */
@Component({
  selector: 'app-comparador',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './comparador.component.html',
  styleUrl: './comparador.component.scss',
})
export class ComparadorComponent implements OnInit {
  private readonly explorar = inject(ExplorarService);
  private readonly fd = inject(FootballDataService);

  equiposApp: EquipoComparacion[] = [];
  competiciones: FdCompeticion[] = [];
  cargandoListas = false;
  error: string | null = null;

  readonly ladoA = nuevoLado();
  readonly ladoB = nuevoLado();
  readonly lados: Lado[] = [this.ladoA, this.ladoB];

  ngOnInit(): void {
    this.cargandoListas = true;
    this.explorar.listarEquipos().subscribe({
      next: (e) => {
        this.equiposApp = e;
        this.cargandoListas = false;
      },
      error: (err: Error) => {
        this.error = err?.message ?? 'No se pudieron cargar los equipos.';
        this.cargandoListas = false;
      },
    });
    // Las competiciones de la API son opcionales (puede no haber API key): no bloquean.
    this.fd.listarCompeticiones().subscribe({
      next: (c) => (this.competiciones = c),
      error: () => { /* sin API: solo se compararán equipos de la app */ },
    });
  }

  cambiarFuente(lado: Lado): void {
    lado.equipoAppId = null;
    lado.competicionCode = null;
    lado.equipoApiId = null;
    lado.equiposApi = [];
    lado.plantilla = [];
    lado.nombre = '';
  }

  cambiarEquipoApp(lado: Lado): void {
    lado.plantilla = [];
    if (lado.equipoAppId == null) { lado.nombre = ''; return; }
    lado.nombre = this.equiposApp.find((e) => e.id === lado.equipoAppId)?.nombre ?? '';
    lado.cargando = true;
    this.explorar.plantilla(lado.equipoAppId).subscribe({
      next: (j) => { lado.plantilla = this.ordenar(j); lado.cargando = false; },
      error: (err: Error) => { this.error = err?.message ?? 'Error al cargar la plantilla.'; lado.cargando = false; },
    });
  }

  cambiarCompeticion(lado: Lado): void {
    lado.equipoApiId = null;
    lado.equiposApi = [];
    lado.plantilla = [];
    lado.nombre = '';
    if (!lado.competicionCode) return;
    lado.cargandoEquiposApi = true;
    this.fd.listarEquipos(lado.competicionCode).subscribe({
      next: (e) => { lado.equiposApi = e; lado.cargandoEquiposApi = false; },
      error: (err: Error) => { this.error = err?.message ?? 'Error al cargar los equipos de la liga.'; lado.cargandoEquiposApi = false; },
    });
  }

  cambiarEquipoApi(lado: Lado): void {
    lado.plantilla = [];
    if (lado.equipoApiId == null) { lado.nombre = ''; return; }
    lado.nombre = lado.equiposApi.find((e) => e.id === lado.equipoApiId)?.name ?? '';
    lado.cargando = true;
    this.fd.listarPlantillaEquipo(lado.equipoApiId).subscribe({
      next: (squad) => {
        lado.plantilla = squad.map((s) => {
          const { nombre, apellidos } = splitNombre(s.name);
          return {
            jugadorId: s.id,
            nombre: apellidos ? `${nombre} ${apellidos}` : nombre,
            posicion: mapFdPosicion(s.position),
            dorsal: s.shirtNumber ?? undefined,
            goles: 0,
            asistencias: 0,
            minutos: 0,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            impacto: 0,
          } as PlantillaJugador;
        });
        lado.cargando = false;
      },
      error: (err: Error) => { this.error = err?.message ?? 'Error al cargar la plantilla de la API.'; lado.cargando = false; },
    });
  }

  private ordenar(j: PlantillaJugador[]): PlantillaJugador[] {
    return [...j].sort((a, b) => b.impacto - a.impacto);
  }

  totalImpacto(plantilla: PlantillaJugador[]): number {
    return Math.round(plantilla.reduce((sum, j) => sum + (j.impacto ?? 0), 0) * 10) / 10;
  }

  totalGoles(plantilla: PlantillaJugador[]): number {
    return plantilla.reduce((sum, j) => sum + (j.goles ?? 0), 0);
  }

  trackByJugador(_: number, j: PlantillaJugador): number {
    return j.jugadorId;
  }
}
