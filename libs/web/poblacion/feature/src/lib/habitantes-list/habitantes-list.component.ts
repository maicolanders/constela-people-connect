import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, CatalogoItemCache, CatalogoOfflineService } from '@censo/web-shared-data-access';
import { HabitantesPullService } from '@censo/web-poblacion-data-access';
import { TranslatePipe } from '@ngx-translate/core';

interface HabitanteApi {
  id: number;
  uuid: string;
  hogarId: number;
  estado: string;
  nombres: string;
  apellidos: string;
  tipoDocumentoId: number | null;
  numeroDocumento?: string;
  fechaNacimiento: string;
  sexo: string;
}

interface HogarApi {
  id: number;
  uuid: string;
}

const TAMANO_PAGINA = 30;

/**
 * RF-01-04 + RNF-05: listado paginado de los habitantes de la comunidad del
 * usuario, con búsqueda por tipo+número de documento. Una comunidad puede
 * llegar a tener cientos de miles de registros — cargarlos todos de una vez
 * (la versión anterior leía la caché offline completa, previamente
 * descargada entera por `HabitantesPullService`) deja de ser viable a esa
 * escala, así que esta pantalla consulta el backend paginado directamente
 * (`limit`/`offset`) en vez de leer la caché offline. El pull de
 * `HabitantesPullService` (usado por la detección de duplicados sin
 * conexión, RF-01-05) se sigue disparando en segundo plano sin bloquear esta
 * pantalla ni su paginación.
 */
@Component({
  selector: 'app-habitantes-list',
  standalone: true,
  imports: [TranslatePipe, RouterLink, FormsModule],
  templateUrl: './habitantes-list.component.html',
})
export class HabitantesListComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly habitantesPull = inject(HabitantesPullService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly cargandoMas = signal(false);
  readonly sinComunidad = signal(false);
  readonly error = signal<string | null>(null);
  readonly habitantes = signal<HabitanteApi[]>([]);
  readonly hayMas = signal(false);
  readonly total = signal<number | null>(null);
  readonly tiposDocumento = signal<CatalogoItemCache[]>([]);
  readonly hogarUuidPorHogarId = signal(new Map<number, string>());

  tipoDocumentoIdBusqueda: number | null = null;
  numeroDocumentoBusqueda = '';

  private comunidadId: number | null = null;

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.comunidadId = usuario.asignaciones.find((asignacion) => asignacion.comunidadId !== null)?.comunidadId ?? null;

    if (this.comunidadId === null) {
      this.sinComunidad.set(true);
      this.cargando.set(false);
      return;
    }

    void this.habitantesPull.actualizar(this.comunidadId);
    this.tiposDocumento.set(await this.catalogoOffline.obtenerItems('tipo_documento'));

    try {
      const respuesta = await firstValueFrom(
        this.http.get<{ total: number }>('/api/poblacion/habitantes/conteo', { params: { comunidadId: this.comunidadId } }),
      );
      this.total.set(respuesta.total);
    } catch {
      this.total.set(null);
    }

    await this.cargarPagina(true);
  }

  async buscar(): Promise<void> {
    await this.cargarPagina(true);
  }

  async limpiarBusqueda(): Promise<void> {
    this.tipoDocumentoIdBusqueda = null;
    this.numeroDocumentoBusqueda = '';
    await this.cargarPagina(true);
  }

  async cargarMas(): Promise<void> {
    if (this.cargandoMas() || !this.hayMas()) {
      return;
    }
    await this.cargarPagina(false);
  }

  edad(fechaNacimiento: string): number {
    const nacimiento = new Date(fechaNacimiento);
    const hoy = new Date();
    const edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumpleAnios =
      hoy.getMonth() < nacimiento.getMonth() ||
      (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    return aunNoCumpleAnios ? edad - 1 : edad;
  }

  nombreTipoDocumento(id: number | null): string | null {
    if (id === null) {
      return null;
    }
    return this.tiposDocumento().find((tipo) => tipo.id === id)?.nombre ?? null;
  }

  hogarUuidDe(habitante: HabitanteApi): string | null {
    return this.hogarUuidPorHogarId().get(habitante.hogarId) ?? null;
  }

  private async cargarPagina(reiniciar: boolean): Promise<void> {
    if (this.comunidadId === null) {
      return;
    }
    this.error.set(null);
    if (reiniciar) {
      this.cargando.set(true);
    } else {
      this.cargandoMas.set(true);
    }

    const offset = reiniciar ? 0 : this.habitantes().length;
    const params: Record<string, string | number> = {
      comunidadId: this.comunidadId,
      limit: TAMANO_PAGINA + 1,
      offset,
    };
    if (this.tipoDocumentoIdBusqueda !== null) {
      params['tipoDocumentoId'] = this.tipoDocumentoIdBusqueda;
    }
    if (this.numeroDocumentoBusqueda.trim()) {
      params['numeroDocumento'] = this.numeroDocumentoBusqueda.trim();
    }

    try {
      const pagina = await firstValueFrom(this.http.get<HabitanteApi[]>('/api/poblacion/habitantes', { params }));
      const hayMas = pagina.length > TAMANO_PAGINA;
      const items = hayMas ? pagina.slice(0, TAMANO_PAGINA) : pagina;

      await this.resolverHogarUuids(items);
      this.habitantes.set(reiniciar ? items : [...this.habitantes(), ...items]);
      this.hayMas.set(hayMas);
    } catch {
      this.error.set('poblacion.errorCargarHabitantes');
      if (reiniciar) {
        this.habitantes.set([]);
        this.hayMas.set(false);
      }
    } finally {
      this.cargando.set(false);
      this.cargandoMas.set(false);
    }
  }

  /** Resuelve solo los hogarId de la página actual (acotado, nunca toda la comunidad) para armar el link "ver acciones". */
  private async resolverHogarUuids(items: HabitanteApi[]): Promise<void> {
    const mapaActual = this.hogarUuidPorHogarId();
    const idsFaltantes = [...new Set(items.map((item) => item.hogarId))].filter((id) => !mapaActual.has(id));
    if (idsFaltantes.length === 0) {
      return;
    }

    try {
      const hogares = await firstValueFrom(
        this.http.get<HogarApi[]>('/api/poblacion/hogares', {
          params: { comunidadId: this.comunidadId as number, ids: idsFaltantes.join(',') },
        }),
      );
      const actualizado = new Map(mapaActual);
      for (const hogar of hogares) {
        actualizado.set(hogar.id, hogar.uuid);
      }
      this.hogarUuidPorHogarId.set(actualizado);
    } catch {
      // Falla de red al resolver hogarUuid: el link "ver acciones" de esas filas queda oculto hasta el próximo intento.
    }
  }
}
