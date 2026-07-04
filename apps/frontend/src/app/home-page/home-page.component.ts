import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  template: `
    <p class="mb-4 text-sm text-slate-600">{{ 'shell.title' | translate }}</p>
    <a routerLink="/poblacion/habitantes" class="text-sm font-medium text-slate-900 underline">
      {{ 'poblacion.habitantesTitulo' | translate }}
    </a>
  `,
})
export class HomePageComponent {}
