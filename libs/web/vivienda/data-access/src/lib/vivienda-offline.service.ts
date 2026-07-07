import { Injectable } from '@angular/core';
import { AppDatabase, OfflineRepository, OperacionSync, SyncQueueService, ViviendaOffline } from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<ViviendaOffline> (RF-04-01/02, captura offline). */
@Injectable({ providedIn: 'root' })
export class ViviendaOfflineService {
  private readonly repositorio: OfflineRepository<ViviendaOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<ViviendaOffline>(db.viviendas, 'viviendas', syncQueue);
  }

  obtenerPorHogar(hogarUuid: string): Promise<ViviendaOffline | undefined> {
    return this.repositorio.obtener(hogarUuid);
  }

  guardar(vivienda: ViviendaOffline, operacion: OperacionSync = 'crear'): Promise<void> {
    return this.repositorio.guardar(vivienda, operacion);
  }
}
