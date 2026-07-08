import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

export interface MiembroNucleoFamiliarApi {
  habitanteId: number;
  nombres: string;
  apellidos: string;
  estado: string;
  esJefeHogar: boolean;
  parentescoCodigo: string | null;
  parentescoNombre: string | null;
}

export interface NucleoFamiliarApi {
  hogarId: number;
  miembros: MiembroNucleoFamiliarApi[];
}

/**
 * Fase 11: organigrama del núcleo familiar de un hogar. El único vínculo
 * familiar que el backend registra es "parentesco con el jefe de hogar"
 * (ver `HabitanteService.obtenerNucleoFamiliar`) — no hay un grafo más
 * amplio de relaciones habitante-a-habitante, así que se representa como
 * una estrella de un nivel: el jefe arriba, cada otro miembro debajo
 * conectado con su parentesco relativo a él.
 */
@Component({
  selector: 'app-nucleo-familiar',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './nucleo-familiar.component.html',
})
export class NucleoFamiliarComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly nucleo = signal<NucleoFamiliarApi | null>(null);

  readonly jefeHogar = computed(() => this.nucleo()?.miembros.find((miembro) => miembro.esJefeHogar) ?? null);
  readonly otrosMiembros = computed(() => this.nucleo()?.miembros.filter((miembro) => !miembro.esJefeHogar) ?? []);

  async ngOnInit(): Promise<void> {
    const hogarId = Number(this.route.snapshot.paramMap.get('id'));
    try {
      this.nucleo.set(await firstValueFrom(this.http.get<NucleoFamiliarApi>(`/api/poblacion/hogares/${hogarId}/nucleo-familiar`)));
    } catch {
      this.error.set('administracion.errorCargarNucleoFamiliar');
    } finally {
      this.cargando.set(false);
    }
  }
}
