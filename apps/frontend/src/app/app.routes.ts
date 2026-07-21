import { Route } from '@angular/router';
import {
  authGuard,
  habitanteAuthGuard,
  LoginPageComponent,
  roleGuard,
  ShellLayoutComponent,
} from '@censo/web-shared-feature';
import {
  HabitanteAccionesComponent,
  HabitanteCambioHogarComponent,
  HabitanteFormComponent,
  HabitantesListComponent,
  HogarFormComponent,
  HogarUbicacionFormComponent,
} from '@censo/web-poblacion-feature';
import {
  IndicadoresDemograficosComponent,
  PiramidePoblacionalComponent,
} from '@censo/web-demografia-feature';
import { MapaHogaresComponent } from '@censo/web-georreferenciacion-feature';
import {
  CoberturaServiciosComponent,
  ViviendaFormComponent,
} from '@censo/web-vivienda-feature';
import {
  EducacionFormComponent,
  IndicadoresEducativosComponent,
} from '@censo/web-educacion-feature';
import {
  EconomiaFormComponent,
  IndicadoresEconomicosComponent,
} from '@censo/web-economia-feature';
import {
  FlujosMigratoriosComponent,
  MigracionFormComponent,
} from '@censo/web-migracion-feature';
import {
  CaracterizacionEtnicaComponent,
  EtniaVulnerabilidadFormComponent,
} from '@censo/web-etnia-vulnerabilidad-feature';
import {
  PanelIndicadoresRecursosComponent,
  PresupuestoFormComponent,
} from '@censo/web-recursos-feature';
import {
  ComparacionHistoricaComponent,
  GestionPeriodosComponent,
  NotificacionesComponent,
} from '@censo/web-periodo-censal-feature';
import {
  ComunidadDetalleComponent,
  HabitanteFichaComponent,
  NucleoFamiliarComponent,
  PanelComunidadesComponent,
} from '@censo/web-administracion-feature';
import {
  AutogestionLoginComponent,
  AutogestionRegistroComponent,
  AutogestionShellComponent,
  MiConstanciaComponent,
  MiEconomiaComponent,
  MiEducacionComponent,
  MiHogarComponent,
  MiPerfilComponent,
  MiSaludComponent,
} from '@censo/web-autogestion-feature';
import { HomePageComponent } from './home-page/home-page.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPageComponent },
  { path: 'autogestion/login', component: AutogestionLoginComponent },
  { path: 'autogestion/registro', component: AutogestionRegistroComponent },
  {
    path: 'autogestion',
    component: AutogestionShellComponent,
    canActivate: [habitanteAuthGuard],
    children: [
      { path: 'mi-hogar', component: MiHogarComponent },
      { path: 'mi-perfil', component: MiPerfilComponent },
      { path: 'educacion', component: MiEducacionComponent },
      { path: 'economia', component: MiEconomiaComponent },
      { path: 'salud', component: MiSaludComponent },
      { path: 'constancia', component: MiConstanciaComponent },
    ],
  },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomePageComponent },
      { path: 'poblacion/habitantes', component: HabitantesListComponent },
      { path: 'poblacion/hogares/nuevo', component: HogarFormComponent },
      {
        path: 'poblacion/hogares/:hogarUuid/habitantes/nuevo',
        component: HabitanteFormComponent,
      },
      {
        path: 'poblacion/hogares/:hogarUuid/habitantes/:habitanteUuid/acciones',
        component: HabitanteAccionesComponent,
      },
      {
        path: 'poblacion/habitantes/:habitanteUuid/editar',
        component: HabitanteFormComponent,
      },
      {
        path: 'poblacion/habitantes/:habitanteUuid/cambiar-hogar',
        component: HabitanteCambioHogarComponent,
      },
      {
        path: 'poblacion/hogares/:hogarUuid/ubicacion',
        component: HogarUbicacionFormComponent,
      },
      {
        path: 'poblacion/hogares/:hogarUuid/vivienda',
        component: ViviendaFormComponent,
      },
      { path: 'poblacion/hogares/mapa', component: MapaHogaresComponent },
      { path: 'vivienda/cobertura', component: CoberturaServiciosComponent },
      {
        path: 'poblacion/habitantes/:habitanteUuid/educacion',
        component: EducacionFormComponent,
      },
      {
        path: 'educacion/indicadores',
        component: IndicadoresEducativosComponent,
      },
      {
        path: 'poblacion/habitantes/:habitanteUuid/economia',
        component: EconomiaFormComponent,
      },
      {
        path: 'economia/indicadores',
        component: IndicadoresEconomicosComponent,
      },
      {
        path: 'poblacion/habitantes/:habitanteUuid/migracion',
        component: MigracionFormComponent,
      },
      { path: 'migracion/flujos', component: FlujosMigratoriosComponent },
      {
        path: 'poblacion/habitantes/:habitanteUuid/etnia-vulnerabilidad',
        component: EtniaVulnerabilidadFormComponent,
      },
      {
        path: 'etnia-vulnerabilidad/caracterizacion',
        component: CaracterizacionEtnicaComponent,
      },
      {
        path: 'recursos/presupuestos/nuevo',
        component: PresupuestoFormComponent,
      },
      {
        path: 'recursos/indicadores',
        component: PanelIndicadoresRecursosComponent,
      },
      {
        path: 'periodo-censal/gestion',
        component: GestionPeriodosComponent,
      },
      {
        path: 'periodo-censal/comparacion-historica',
        component: ComparacionHistoricaComponent,
      },
      {
        path: 'periodo-censal/notificaciones',
        component: NotificacionesComponent,
      },
      {
        path: 'poblacion/demografia/piramide',
        component: PiramidePoblacionalComponent,
      },
      {
        path: 'poblacion/demografia/indicadores',
        component: IndicadoresDemograficosComponent,
      },
      {
        path: 'administracion/comunidades',
        component: PanelComunidadesComponent,
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
      },
      {
        path: 'administracion/comunidades/:id',
        component: ComunidadDetalleComponent,
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
      },
      {
        path: 'administracion/habitantes/:id',
        component: HabitanteFichaComponent,
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
      },
      {
        path: 'administracion/hogares/:id/nucleo-familiar',
        component: NucleoFamiliarComponent,
        canActivate: [roleGuard],
        data: { roles: ['administrador'] },
      },
    ],
  },
];
