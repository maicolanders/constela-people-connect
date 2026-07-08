import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

interface TarjetaInicio {
  ruta: string;
  tituloKey: string;
  descripcionKey: string;
}

/** Panel principal: acceso directo a captura de campo y a los reportes de cada dominio ya implementado. */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent {
  readonly tarjetasCaptura: TarjetaInicio[] = [
    {
      ruta: '/poblacion/hogares/nuevo',
      tituloKey: 'poblacion.nuevoHogar',
      descripcionKey: 'home.descNuevoHogar',
    },
    {
      ruta: '/poblacion/habitantes',
      tituloKey: 'poblacion.habitantesTitulo',
      descripcionKey: 'home.descHabitantes',
    },
    {
      ruta: '/poblacion/hogares/mapa',
      tituloKey: 'georreferenciacion.mapaTitulo',
      descripcionKey: 'home.descMapa',
    },
  ];

  readonly tarjetasReportes: TarjetaInicio[] = [
    {
      ruta: '/poblacion/demografia/piramide',
      tituloKey: 'demografia.piramideTitulo',
      descripcionKey: 'home.descPiramide',
    },
    {
      ruta: '/poblacion/demografia/indicadores',
      tituloKey: 'demografia.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresDemograficos',
    },
    {
      ruta: '/vivienda/cobertura',
      tituloKey: 'vivienda.coberturaTitulo',
      descripcionKey: 'home.descCobertura',
    },
    {
      ruta: '/educacion/indicadores',
      tituloKey: 'educacion.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresEducativos',
    },
    {
      ruta: '/economia/indicadores',
      tituloKey: 'economia.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresEconomicos',
    },
    {
      ruta: '/migracion/flujos',
      tituloKey: 'migracion.flujosTitulo',
      descripcionKey: 'home.descFlujosMigratorios',
    },
    {
      ruta: '/etnia-vulnerabilidad/caracterizacion',
      tituloKey: 'etniaVulnerabilidad.tituloReporte',
      descripcionKey: 'home.descCaracterizacionEtnica',
    },
  ];
}
