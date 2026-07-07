import { Injectable } from '@angular/core';
import { AppDatabase, HabitanteOcupacionOffline, OfflineRepository, OperacionSync, SyncQueueService } from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HabitanteOcupacionOffline> (RF-06-01, captura offline). */
@Injectable({ providedIn: 'root' })
export class EconomiaOfflineService {
  private readonly repositorio: OfflineRepository<HabitanteOcupacionOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HabitanteOcupacionOffline>(db.habitanteOcupaciones, 'ocupaciones', syncQueue);
  }

  obtenerPorHabitante(habitanteUuid: string): Promise<HabitanteOcupacionOffline | undefined> {
    return this.repositorio.obtener(habitanteUuid);
  }

  guardar(ocupacion: HabitanteOcupacionOffline, operacion: OperacionSync = 'crear'): Promise<void> {
    return this.repositorio.guardar(ocupacion, operacion);
  }
}
