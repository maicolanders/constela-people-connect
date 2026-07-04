import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDatabase, CatalogoItemCache } from '../database/app-database';

interface CatalogoItemApi {
  id: number;
  codigo: string;
  nombre: string;
  padreId: number | null;
  orden: number;
}

/**
 * Catálogos para selects/autocompletado en formularios de campo (RNF-07),
 * disponibles sin conexión: si hay red, refresca la caché local desde la API;
 * si no la hay (o la petición falla), sirve directamente desde IndexedDB.
 */
@Injectable({ providedIn: 'root' })
export class CatalogoOfflineService {
  constructor(
    private readonly http: HttpClient,
    private readonly db: AppDatabase,
  ) {}

  async obtenerItems(tipoCodigo: string): Promise<CatalogoItemCache[]> {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const items = await firstValueFrom(this.http.get<CatalogoItemApi[]>(`/api/catalogos/${tipoCodigo}/items`));
        await this.reemplazarCache(tipoCodigo, items);
      } catch {
        // Sin respuesta del servidor: se continúa con lo que haya en caché local.
      }
    }
    return this.db.catalogoCache.where('tipoCodigo').equals(tipoCodigo).sortBy('orden');
  }

  private async reemplazarCache(tipoCodigo: string, items: CatalogoItemApi[]): Promise<void> {
    await this.db.transaction('rw', this.db.catalogoCache, async () => {
      await this.db.catalogoCache.where('tipoCodigo').equals(tipoCodigo).delete();
      await this.db.catalogoCache.bulkPut(
        items.map((item) => ({
          clave: `${tipoCodigo}:${item.codigo}`,
          tipoCodigo,
          id: item.id,
          codigo: item.codigo,
          nombre: item.nombre,
          padreId: item.padreId,
          orden: item.orden,
        })),
      );
    });
  }
}
