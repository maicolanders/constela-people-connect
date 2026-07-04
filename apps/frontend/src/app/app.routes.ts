import { Route } from '@angular/router';
import { authGuard, LoginPageComponent, ShellLayoutComponent } from '@censo/web-shared-feature';
import { HabitanteFormComponent, HabitantesListComponent, HogarFormComponent } from '@censo/web-poblacion-feature';
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
    ],
  },
];
