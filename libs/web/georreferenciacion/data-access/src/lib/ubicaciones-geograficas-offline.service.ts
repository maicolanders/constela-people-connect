import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDatabase, UbicacionGeograficaCache } from '@censo/web-shared-data-access';

interface UbicacionGeograficaApi {
  id: number;
  nivelGeograficoCatalogoItemId: number;
  padreId: number | null;
  nombre: string;
  codigo: string | null;
}

/**
 * Árbol de jerarquía geográfica (RF-03-01) para los selects en cascada del
 * formulario de ubicación de hogar, disponible offline (mismo patrón que
 * CatalogoOfflineService: refresca la caché si hay red, sirve de IndexedDB si no).
 */
@Injectable({ providedIn: 'root' })
export class UbicacionesGeograficasOfflineService {
  constructor(
    private readonly http: HttpClient,
    private readonly db: AppDatabase,
  ) {}

  async listarHijos(padreId?: number): Promise<UbicacionGeograficaCache[]> {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const parametros = padreId !== undefined ? `?padreId=${padreId}` : '';
        const nodos = await firstValueFrom(
          this.http.get<UbicacionGeograficaApi[]>(`/api/georreferenciacion/ubicaciones-geograficas${parametros}`),
        );
        await this.reemplazarCache(padreId, nodos);
      } catch {
        // Sin respuesta del servidor: se continúa con lo que haya en caché local.
      }
    }
    const todos = await this.db.ubicacionesGeograficasCache.toArray();
    return todos.filter((nodo) => (padreId === undefined ? nodo.padreId === null : nodo.padreId === padreId));
  }

  private async reemplazarCache(padreId: number | undefined, nodos: UbicacionGeograficaApi[]): Promise<void> {
    await this.db.transaction('rw', this.db.ubicacionesGeograficasCache, async () => {
      const existentes = await this.db.ubicacionesGeograficasCache.toArray();
      const aBorrar = existentes.filter((nodo) => (padreId === undefined ? nodo.padreId === null : nodo.padreId === padreId));
      await this.db.ubicacionesGeograficasCache.bulkDelete(aBorrar.map((nodo) => nodo.id));
      await this.db.ubicacionesGeograficasCache.bulkPut(
        nodos.map((nodo) => ({
          id: nodo.id,
          nivelGeograficoCatalogoItemId: nodo.nivelGeograficoCatalogoItemId,
          padreId: nodo.padreId,
          nombre: nodo.nombre,
          codigo: nodo.codigo,
        })),
      );
    });
  }
}
