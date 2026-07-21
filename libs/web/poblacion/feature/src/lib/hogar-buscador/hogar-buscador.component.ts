import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

interface HogarApi {
  id: number;
  uuid: string;
  estado: string;
  jefeHogarId: number | null;
  direccionReferencia: string | null;
}

interface HabitanteApi {
  id: number;
  nombres: string;
  apellidos: string;
}

export interface HogarBuscadoResultado {
  id: number;
  uuid: string;
  direccionReferencia: string | null;
  jefeHogarNombre: string | null;
}

/**
 * Buscador de hogares activos de una comunidad (usado para elegir el hogar
 * destino al reasignar un habitante, RF-01-03). Resuelve el nombre del jefe
 * de hogar cruzando client-side contra `GET /poblacion/habitantes` — nunca
 * pide la relación `jefeHogar` al backend: `SensitiveFieldsInterceptor` no es
 * recursivo, así que exponer esa relación anidada filtraría el
 * `numeroDocumento` del jefe de hogar sin redactar.
 */
@Component({
  selector: 'app-hogar-buscador',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './hogar-buscador.component.html',
})
export class HogarBuscadorComponent {
  private readonly http = inject(HttpClient);

  @Input({ required: true }) comunidadId!: number;
  @Input() excluirHogarUuid?: string;
  @Output() readonly hogarSeleccionado = new EventEmitter<HogarBuscadoResultado>();

  readonly termino = signal('');
  readonly buscando = signal(false);
  readonly error = signal<string | null>(null);
  readonly resultados = signal<HogarBuscadoResultado[] | null>(null);

  async buscar(): Promise<void> {
    this.buscando.set(true);
    this.error.set(null);

    try {
      const [hogares, habitantes] = await Promise.all([
        firstValueFrom(
          this.http.get<HogarApi[]>('/api/poblacion/hogares', {
            params: { comunidadId: this.comunidadId, estado: 'activo', busqueda: this.termino() },
          }),
        ),
        firstValueFrom(
          this.http.get<HabitanteApi[]>('/api/poblacion/habitantes', { params: { comunidadId: this.comunidadId } }),
        ),
      ]);

      const nombresPorHabitante = new Map(habitantes.map((habitante) => [habitante.id, `${habitante.nombres} ${habitante.apellidos}`]));

      this.resultados.set(
        hogares
          .filter((hogar) => hogar.uuid !== this.excluirHogarUuid)
          .map((hogar) => ({
            id: hogar.id,
            uuid: hogar.uuid,
            direccionReferencia: hogar.direccionReferencia,
            jefeHogarNombre: hogar.jefeHogarId !== null ? (nombresPorHabitante.get(hogar.jefeHogarId) ?? null) : null,
          })),
      );
    } catch {
      this.error.set('poblacion.errorBuscarHogar');
      this.resultados.set(null);
    } finally {
      this.buscando.set(false);
    }
  }

  seleccionar(hogar: HogarBuscadoResultado): void {
    this.hogarSeleccionado.emit(hogar);
  }
}
