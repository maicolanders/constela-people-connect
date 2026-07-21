import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

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
 * Fase 14 (autogestión): árbol genealógico del propio hogar del habitante.
 * Mismo patrón visual que `NucleoFamiliarComponent` (administración, Fase
 * 11) — reescrito localmente en vez de importado, para que `domain:autogestion`
 * no dependa de `domain:administracion` (nada en `eslint.config.mjs` lo
 * permitiría, y tampoco haría falta: es la misma estrella de un nivel, solo
 * que sin enlaces a fichas de otros habitantes, que el propio habitante no
 * tiene permiso de ver). Consulta `GET .../mi-hogar/nucleo-familiar` — sin
 * ningún `hogarId` en la URL, el backend siempre resuelve el hogar del
 * habitante autenticado.
 */
@Component({
  selector: 'app-mi-hogar',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './mi-hogar.component.html',
})
export class MiHogarComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly nucleo = signal<NucleoFamiliarApi | null>(null);

  readonly jefeHogar = computed(() => this.nucleo()?.miembros.find((miembro) => miembro.esJefeHogar) ?? null);
  readonly otrosMiembros = computed(() => this.nucleo()?.miembros.filter((miembro) => !miembro.esJefeHogar) ?? []);

  async ngOnInit(): Promise<void> {
    try {
      this.nucleo.set(
        await firstValueFrom(this.http.get<NucleoFamiliarApi>('/api/poblacion/habitantes/mi-hogar/nucleo-familiar')),
      );
    } catch {
      this.error.set('autogestion.errorCargarMiHogar');
    } finally {
      this.cargando.set(false);
    }
  }
}
