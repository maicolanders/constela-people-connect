import { Table } from 'dexie';
import { OperacionSync } from '../database/app-database';
import { SyncQueueService } from '../sync/sync-queue.service';

export interface EntidadOffline {
  uuid: string;
}

/**
 * Repositorio genérico para entidades capturables offline (Fase 1+:
 * habitantes, hogares, viviendas, ...). Cada dominio crea su propia tabla
 * Dexie (agregada al esquema de AppDatabase) y una instancia de este
 * repositorio sobre ella; nunca se accede a la tabla directamente desde
 * componentes (CLAUDE.md).
 */
export class OfflineRepository<T extends EntidadOffline> {
  constructor(
    private readonly tabla: Table<T, string>,
    private readonly dominio: string,
    private readonly syncQueue: SyncQueueService,
  ) {}

  listar(): Promise<T[]> {
    return this.tabla.toArray();
  }

  obtener(uuid: string): Promise<T | undefined> {
    return this.tabla.get(uuid);
  }

  async guardar(entidad: T, operacion: OperacionSync): Promise<void> {
    await this.tabla.put(entidad);
    await this.syncQueue.encolar(this.dominio, entidad.uuid, operacion, entidad as unknown as Record<string, unknown>);
  }

  async eliminar(uuid: string): Promise<void> {
    const entidad = await this.tabla.get(uuid);
    await this.tabla.delete(uuid);
    if (entidad) {
      await this.syncQueue.encolar(this.dominio, uuid, 'eliminar', entidad as unknown as Record<string, unknown>);
    }
  }
}
