import { Injectable } from '@angular/core';
import { AppDatabase, HabitanteEducacionOffline, OfflineRepository, OperacionSync, SyncQueueService } from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HabitanteEducacionOffline> (RF-05-01, captura offline). */
@Injectable({ providedIn: 'root' })
export class EducacionOfflineService {
  private readonly repositorio: OfflineRepository<HabitanteEducacionOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HabitanteEducacionOffline>(db.habitanteEducaciones, 'educaciones', syncQueue);
  }

  obtenerPorHabitante(habitanteUuid: string): Promise<HabitanteEducacionOffline | undefined> {
    return this.repositorio.obtener(habitanteUuid);
  }

  guardar(educacion: HabitanteEducacionOffline, operacion: OperacionSync = 'crear'): Promise<void> {
    return this.repositorio.guardar(educacion, operacion);
  }
}
