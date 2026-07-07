import { Route } from '@angular/router';
import { authGuard, LoginPageComponent, ShellLayoutComponent } from '@censo/web-shared-feature';
import {
  HabitanteFormComponent,
  HabitantesListComponent,
  HogarFormComponent,
  HogarUbicacionFormComponent,
} from '@censo/web-poblacion-feature';
import { IndicadoresDemograficosComponent, PiramidePoblacionalComponent } from '@censo/web-demografia-feature';
import { MapaHogaresComponent } from '@censo/web-georreferenciacion-feature';
import { CoberturaServiciosComponent, ViviendaFormComponent } from '@censo/web-vivienda-feature';
import { EducacionFormComponent, IndicadoresEducativosComponent } from '@censo/web-educacion-feature';
import { HomePageComponent } from './home-page/home-page.component';

export const appRoutes: Route[] = [
  { path: 'login', component: LoginPageComponent },
  {
    path: '',
    component: ShellLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: HomePageComponent },
      { path: 'poblacion/habitantes', component: HabitantesListComponent },
      { path: 'poblacion/hogares/nuevo', component: HogarFormComponent },
      { path: 'poblacion/hogares/:hogarUuid/habitantes/nuevo', component: HabitanteFormComponent },
      { path: 'poblacion/hogares/:hogarUuid/ubicacion', component: HogarUbicacionFormComponent },
      { path: 'poblacion/hogares/:hogarUuid/vivienda', component: ViviendaFormComponent },
      { path: 'poblacion/hogares/mapa', component: MapaHogaresComponent },
      { path: 'vivienda/cobertura', component: CoberturaServiciosComponent },
      { path: 'poblacion/habitantes/:habitanteUuid/educacion', component: EducacionFormComponent },
      { path: 'educacion/indicadores', component: IndicadoresEducativosComponent },
      { path: 'poblacion/demografia/piramide', component: PiramidePoblacionalComponent },
      { path: 'poblacion/demografia/indicadores', component: IndicadoresDemograficosComponent },
    ],
  },
];
