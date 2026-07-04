import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, HabitanteOffline } from '@censo/web-shared-data-access';
import { HabitantesOfflineService, HabitantesPullService } from '@censo/web-poblacion-data-access';
import { TranslatePipe } from '@ngx-translate/core';

/** RF-01-04: listado + conteo de población activa de la comunidad del usuario. */
@Component({
  selector: 'app-habitantes-list',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './habitantes-list.component.html',
})
export class HabitantesListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly habitantesPull = inject(HabitantesPullService);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly sinComunidad = signal(false);
  readonly habitantes = signal<HabitanteOffline[]>([]);
  readonly total = signal<number | null>(null);

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    const comunidadId = usuario.asignaciones.find((asignacion) => asignacion.comunidadId !== null)?.comunidadId ?? null;

    if (comunidadId === null) {
      this.sinComunidad.set(true);
      this.cargando.set(false);
      return;
    }

    await this.habitantesPull.actualizar(comunidadId);
    this.habitantes.set(await this.habitantesOffline.listarPorComunidad(comunidadId));

    try {
      const respuesta = await firstValueFrom(
        this.http.get<{ total: number }>('/api/poblacion/habitantes/conteo', { params: { comunidadId } }),
      );
      this.total.set(respuesta.total);
    } catch {
      this.total.set(null);
    }

    this.cargando.set(false);
  }
}
