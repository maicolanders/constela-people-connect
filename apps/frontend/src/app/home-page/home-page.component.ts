import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@censo/web-shared-data-access';
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
export class HomePageComponent implements OnInit {
  private readonly authService = inject(AuthService);

  /** Fase 11: el panel de administración solo se anuncia a quien realmente puede entrar (roleGuard hace cumplir esto en la ruta). */
  readonly esAdministrador = signal(false);

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.esAdministrador.set(usuario.roles.includes('administrador'));
  }

  readonly tarjetasAdministracion: TarjetaInicio[] = [
    {
      ruta: '/administracion/comunidades',
      tituloKey: 'administracion.tituloPanel',
      descripcionKey: 'home.descPanelAdministracion',
    },
  ];

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
    {
      ruta: '/recursos/indicadores',
      tituloKey: 'recursos.tituloPanel',
      descripcionKey: 'home.descPanelRecursos',
    },
    {
      ruta: '/recursos/presupuestos/nuevo',
      tituloKey: 'recursos.tituloFormPresupuesto',
      descripcionKey: 'home.descPresupuesto',
    },
    {
      ruta: '/periodo-censal/gestion',
      tituloKey: 'periodoCensal.tituloGestion',
      descripcionKey: 'home.descGestionPeriodos',
    },
    {
      ruta: '/periodo-censal/comparacion-historica',
      tituloKey: 'periodoCensal.tituloComparacion',
      descripcionKey: 'home.descComparacionHistorica',
    },
    {
      ruta: '/periodo-censal/notificaciones',
      tituloKey: 'periodoCensal.tituloNotificaciones',
      descripcionKey: 'home.descNotificaciones',
    },
  ];

  /** Fase 14: visible siempre (no es una sesión de staff) — el propio habitante inicia sesión aparte. */
  readonly tarjetasAutogestion: TarjetaInicio[] = [
    {
      ruta: '/autogestion/login',
      tituloKey: 'autogestion.tituloPortal',
      descripcionKey: 'home.descPortalAutogestion',
    },
  ];
}
