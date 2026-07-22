import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@censo/web-shared-data-access';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export type CategoriaTarjeta = 'captura' | 'reportes' | 'administracion' | 'autogestion';

export interface TarjetaInicio {
  ruta: string;
  tituloKey: string;
  descripcionKey: string;
  categoria: CategoriaTarjeta;
  iconoSvg: string;
  colorClase: string;
  badgeKey: string;
}

export interface SeccionHome {
  id: CategoriaTarjeta;
  tituloKey: string;
  tarjetas: TarjetaInicio[];
}

/** Panel principal: acceso directo a captura de campo, reportes, administración y autogestión con búsqueda e iconos. */
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './home-page.component.html',
})
export class HomePageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly translateService = inject(TranslateService);

  /** El panel de administración solo se anuncia a quien realmente puede entrar (roleGuard hace cumplir esto en la ruta). */
  readonly esAdministrador = signal(false);

  /** Filtro de búsqueda por texto */
  readonly busqueda = signal('');

  /** Filtro por categoría seleccionada ('todas' o categoría específica) */
  readonly categoriaSeleccionada = signal<string>('todas');

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.esAdministrador.set(usuario.roles.includes('administrador'));
  }

  /** Tarjetas del sistema codificadas con iconos y esquemas visuales */
  readonly tarjetasCaptura: TarjetaInicio[] = [
    {
      ruta: '/poblacion/hogares/nuevo',
      tituloKey: 'poblacion.nuevoHogar',
      descripcionKey: 'home.descNuevoHogar',
      categoria: 'captura',
      badgeKey: 'home.seccionCaptura',
      colorClase: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white',
      iconoSvg: 'M12 4.5v15m7.5-7.5h-15'
    },
    {
      ruta: '/poblacion/habitantes',
      tituloKey: 'poblacion.habitantesTitulo',
      descripcionKey: 'home.descHabitantes',
      categoria: 'captura',
      badgeKey: 'home.seccionCaptura',
      colorClase: 'bg-teal-500/10 text-teal-600 border-teal-200 group-hover:bg-teal-600 group-hover:text-white',
      iconoSvg: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z'
    },
    {
      ruta: '/poblacion/hogares/mapa',
      tituloKey: 'georreferenciacion.mapaTitulo',
      descripcionKey: 'home.descMapa',
      categoria: 'captura',
      badgeKey: 'home.seccionCaptura',
      colorClase: 'bg-sky-500/10 text-sky-600 border-sky-200 group-hover:bg-sky-600 group-hover:text-white',
      iconoSvg: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z'
    },
  ];

  readonly tarjetasReportes: TarjetaInicio[] = [
    {
      ruta: '/poblacion/demografia/piramide',
      tituloKey: 'demografia.piramideTitulo',
      descripcionKey: 'home.descPiramide',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-indigo-500/10 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white',
      iconoSvg: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
    },
    {
      ruta: '/poblacion/demografia/indicadores',
      tituloKey: 'demografia.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresDemograficos',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-violet-500/10 text-violet-600 border-violet-200 group-hover:bg-violet-600 group-hover:text-white',
      iconoSvg: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 005.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941'
    },
    {
      ruta: '/vivienda/cobertura',
      tituloKey: 'vivienda.coberturaTitulo',
      descripcionKey: 'home.descCobertura',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-purple-500/10 text-purple-600 border-purple-200 group-hover:bg-purple-600 group-hover:text-white',
      iconoSvg: 'M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l9-6.75 9 6.75'
    },
    {
      ruta: '/educacion/indicadores',
      tituloKey: 'educacion.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresEducativos',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-200 group-hover:bg-fuchsia-600 group-hover:text-white',
      iconoSvg: 'M4.26 10.147L12 14.635l7.74-4.488M12 3.167L1.8 9.08l10.2 5.556 10.2-5.556L12 3.167zm0 11.468L5.4 11.135v4.298c0 2.277 2.955 4.134 6.6 4.134s6.6-1.857 6.6-4.134v-4.298l-6.6 3.5z'
    },
    {
      ruta: '/economia/indicadores',
      tituloKey: 'economia.indicadoresTitulo',
      descripcionKey: 'home.descIndicadoresEconomicos',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-amber-500/10 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white',
      iconoSvg: 'M12 6v12m-3-6h6M12 3a9 9 0 100 18 9 9 0 000-18z'
    },
    {
      ruta: '/migracion/flujos',
      tituloKey: 'migracion.flujosTitulo',
      descripcionKey: 'home.descFlujosMigratorios',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-orange-500/10 text-orange-600 border-orange-200 group-hover:bg-orange-600 group-hover:text-white',
      iconoSvg: 'M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m-3-12L21 9m0 0l-4.5 4.5M21 9H7.5'
    },
    {
      ruta: '/etnia-vulnerabilidad/caracterizacion',
      tituloKey: 'etniaVulnerabilidad.tituloReporte',
      descripcionKey: 'home.descCaracterizacionEtnica',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-rose-500/10 text-rose-600 border-rose-200 group-hover:bg-rose-600 group-hover:text-white',
      iconoSvg: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z'
    },
    {
      ruta: '/recursos/indicadores',
      tituloKey: 'recursos.tituloPanel',
      descripcionKey: 'home.descPanelRecursos',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-teal-500/10 text-teal-600 border-teal-200 group-hover:bg-teal-600 group-hover:text-white',
      iconoSvg: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5s1.5 0 1.5 1.5-1.5 1.5-1.5 1.5H9m0-3v6m0 0h2.25m-2.25 3h3'
    },
    {
      ruta: '/recursos/presupuestos/nuevo',
      tituloKey: 'recursos.tituloFormPresupuesto',
      descripcionKey: 'home.descPresupuesto',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white',
      iconoSvg: 'M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      ruta: '/periodo-censal/gestion',
      tituloKey: 'periodoCensal.tituloGestion',
      descripcionKey: 'home.descGestionPeriodos',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-blue-500/10 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white',
      iconoSvg: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5'
    },
    {
      ruta: '/periodo-censal/comparacion-historica',
      tituloKey: 'periodoCensal.tituloComparacion',
      descripcionKey: 'home.descComparacionHistorica',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-slate-500/10 text-slate-700 border-slate-200 group-hover:bg-slate-700 group-hover:text-white',
      iconoSvg: 'M7.5 14.25v2.25m3-4.5v6.75m3-9v9m3-6.75v6.75M3 19.5h18M3 4.5h18'
    },
    {
      ruta: '/periodo-censal/notificaciones',
      tituloKey: 'periodoCensal.tituloNotificaciones',
      descripcionKey: 'home.descNotificaciones',
      categoria: 'reportes',
      badgeKey: 'home.seccionReportes',
      colorClase: 'bg-amber-500/10 text-amber-600 border-amber-200 group-hover:bg-amber-600 group-hover:text-white',
      iconoSvg: 'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0'
    },
  ];

  readonly tarjetasAdministracion: TarjetaInicio[] = [
    {
      ruta: '/administracion/comunidades',
      tituloKey: 'administracion.tituloPanel',
      descripcionKey: 'home.descPanelAdministracion',
      categoria: 'administracion',
      badgeKey: 'home.seccionAdministracion',
      colorClase: 'bg-rose-500/10 text-rose-600 border-rose-200 group-hover:bg-rose-600 group-hover:text-white',
      iconoSvg: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z'
    },
  ];

  readonly tarjetasAutogestion: TarjetaInicio[] = [
    {
      ruta: '/autogestion/login',
      tituloKey: 'autogestion.tituloPortal',
      descripcionKey: 'home.descPortalAutogestion',
      categoria: 'autogestion',
      badgeKey: 'home.seccionAutogestion',
      colorClase: 'bg-cyan-500/10 text-cyan-600 border-cyan-200 group-hover:bg-cyan-600 group-hover:text-white',
      iconoSvg: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
    },
  ];

  /** Lista completa de tarjetas disponibles según permisos */
  readonly todasLasTarjetas = computed<TarjetaInicio[]>(() => {
    const adminCards = this.esAdministrador() ? this.tarjetasAdministracion : [];
    return [
      ...this.tarjetasCaptura,
      ...this.tarjetasReportes,
      ...adminCards,
      ...this.tarjetasAutogestion,
    ];
  });

  /** Agrupación por sección original */
  readonly seccionesOriginales = computed<SeccionHome[]>(() => {
    const list: SeccionHome[] = [
      { id: 'captura', tituloKey: 'home.seccionCaptura', tarjetas: this.tarjetasCaptura },
      { id: 'reportes', tituloKey: 'home.seccionReportes', tarjetas: this.tarjetasReportes },
    ];
    if (this.esAdministrador()) {
      list.push({ id: 'administracion', tituloKey: 'home.seccionAdministracion', tarjetas: this.tarjetasAdministracion });
    }
    list.push({ id: 'autogestion', tituloKey: 'home.seccionAutogestion', tarjetas: this.tarjetasAutogestion });
    return list;
  });

  /** Secciones filtradas dinámicamente según término de búsqueda y categoría activa */
  readonly seccionesFiltradas = computed<SeccionHome[]>(() => {
    const query = this.busqueda().trim().toLowerCase();
    const cat = this.categoriaSeleccionada();

    return this.seccionesOriginales()
      .filter((seccion) => cat === 'todas' || seccion.id === cat)
      .map((seccion) => {
        if (!query) return seccion;

        const tarjetasCoincidentes = seccion.tarjetas.filter((tarjeta) => {
          const titulo = this.translateService.instant(tarjeta.tituloKey).toLowerCase();
          const desc = this.translateService.instant(tarjeta.descripcionKey).toLowerCase();
          return titulo.includes(query) || desc.includes(query) || tarjeta.ruta.toLowerCase().includes(query);
        });

        return { ...seccion, tarjetas: tarjetasCoincidentes };
      })
      .filter((seccion) => seccion.tarjetas.length > 0);
  });

  /** Total de tarjetas que coinciden actualmente con los filtros */
  readonly totalTarjetasVisibles = computed<number>(() => {
    return this.seccionesFiltradas().reduce((acc, sec) => acc + sec.tarjetas.length, 0);
  });

  actualizarBusqueda(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.busqueda.set(input.value);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
    this.categoriaSeleccionada.set('todas');
  }

  seleccionarCategoria(cat: string): void {
    this.categoriaSeleccionada.set(cat);
  }
}

