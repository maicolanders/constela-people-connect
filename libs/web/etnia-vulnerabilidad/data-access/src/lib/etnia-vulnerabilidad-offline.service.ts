import { Injectable } from '@angular/core';
import {
  AppDatabase,
  HabitanteEtniaOffline,
  OfflineRepository,
  OperacionSync,
  SyncQueueService,
} from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HabitanteEtniaOffline> (RF-08-01/02, captura offline). */
@Injectable({ providedIn: 'root' })
export class EtniaVulnerabilidadOfflineService {
  private readonly repositorio: OfflineRepository<HabitanteEtniaOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HabitanteEtniaOffline>(
      db.habitanteEtnias,
      'etnias-vulnerabilidad',
      syncQueue,
    );
  }

  obtenerPorHabitante(
    habitanteUuid: string,
  ): Promise<HabitanteEtniaOffline | undefined> {
    return this.repositorio.obtener(habitanteUuid);
  }

  guardar(
    etnia: HabitanteEtniaOffline,
    operacion: OperacionSync = 'crear',
  ): Promise<void> {
    return this.repositorio.guardar(etnia, operacion);
  }
}
