import { Injectable } from '@angular/core';
import {
  AppDatabase,
  HogarOffline,
  OfflineRepository,
  OperacionSync,
  SyncQueueService,
} from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HogarOffline> (patrón genérico ya construido en Fase 0). */
@Injectable({ providedIn: 'root' })
export class HogaresOfflineService {
  private readonly repositorio: OfflineRepository<HogarOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HogarOffline>(db.hogares, 'hogares', syncQueue);
  }

  listar(): Promise<HogarOffline[]> {
    return this.repositorio.listar();
  }

  obtener(uuid: string): Promise<HogarOffline | undefined> {
    return this.repositorio.obtener(uuid);
  }

  guardar(hogar: HogarOffline, operacion: OperacionSync): Promise<void> {
    return this.repositorio.guardar(hogar, operacion);
  }
}
