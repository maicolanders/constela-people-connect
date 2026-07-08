import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

export interface ComunidadApi {
  id: number;
  nombre: string;
  codigo: string;
  activa: boolean;
}

interface ComunidadFila extends ComunidadApi {
  totalHabitantes: number | null;
}

/**
 * Fase 11: panel de administración global — lista todas las comunidades del
 * sistema (sin scoping por `comunidadesPermitidas`, ya que solo un
 * administrador con asignación global llega a esta pantalla, ver `roleGuard`
 * en las rutas). Compone `/api/comunidades` + `/api/poblacion/habitantes/conteo`
 * ya existentes, sin ningún endpoint de agregación nuevo.
 */
@Component({
  selector: 'app-panel-comunidades',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './panel-comunidades.component.html',
})
export class PanelComunidadesComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadFila[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const comunidades = await firstValueFrom(this.http.get<ComunidadApi[]>('/api/comunidades'));
      const conteos = await Promise.all(
        comunidades.map((comunidad) =>
          firstValueFrom(
            this.http.get<{ total: number }>('/api/poblacion/habitantes/conteo', {
              params: { comunidadId: comunidad.id },
            }),
          ).catch(() => ({ total: null as unknown as number })),
        ),
      );
      this.comunidades.set(comunidades.map((comunidad, indice) => ({ ...comunidad, totalHabitantes: conteos[indice].total })));
    } catch {
      this.error.set('administracion.errorCargarComunidades');
    } finally {
      this.cargando.set(false);
    }
  }
}
