import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { ComunidadApi } from '../panel-comunidades/panel-comunidades.component';

interface HogarApi {
  id: number;
  uuid: string;
  estado: string;
  jefeHogarId: number | null;
  direccionReferencia: string | null;
}

interface HabitanteApi {
  id: number;
  hogarId: number;
  nombres: string;
  apellidos: string;
  estado: string;
  sexo: string;
  fechaNacimiento: string;
}

/** Fase 11: detalle de una comunidad — sus hogares y habitantes, con acceso a la ficha completa de cada persona. */
@Component({
  selector: 'app-comunidad-detalle',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './comunidad-detalle.component.html',
})
export class ComunidadDetalleComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidad = signal<ComunidadApi | null>(null);
  readonly hogares = signal<HogarApi[]>([]);
  readonly habitantes = signal<HabitanteApi[]>([]);

  async ngOnInit(): Promise<void> {
    const comunidadId = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const [comunidad, hogares, habitantes] = await Promise.all([
        firstValueFrom(this.http.get<ComunidadApi>(`/api/comunidades/${comunidadId}`)),
        firstValueFrom(this.http.get<HogarApi[]>('/api/poblacion/hogares', { params: { comunidadId } })),
        firstValueFrom(this.http.get<HabitanteApi[]>('/api/poblacion/habitantes', { params: { comunidadId } })),
      ]);
      this.comunidad.set(comunidad);
      this.hogares.set(hogares);
      this.habitantes.set(habitantes);
    } catch {
      this.error.set('administracion.errorCargarComunidad');
    } finally {
      this.cargando.set(false);
    }
  }

  habitantesDeHogar(hogarId: number): HabitanteApi[] {
    return this.habitantes().filter((habitante) => habitante.hogarId === hogarId);
  }
}
