import { Injectable } from '@angular/core';
import {
  AppDatabase,
  HabitanteOffline,
  OfflineRepository,
  OperacionSync,
  SyncQueueService,
} from '@censo/web-shared-data-access';

/** Envoltorio de dominio sobre OfflineRepository<HabitanteOffline> (patrón genérico ya construido en Fase 0). */
@Injectable({ providedIn: 'root' })
export class HabitantesOfflineService {
  private readonly repositorio: OfflineRepository<HabitanteOffline>;

  constructor(private readonly db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<HabitanteOffline>(db.habitantes, 'habitantes', syncQueue);
  }

  listar(): Promise<HabitanteOffline[]> {
    return this.repositorio.listar();
  }

  obtener(uuid: string): Promise<HabitanteOffline | undefined> {
    return this.repositorio.obtener(uuid);
  }

  guardar(habitante: HabitanteOffline, operacion: OperacionSync): Promise<void> {
    return this.repositorio.guardar(habitante, operacion);
  }

  listarPorComunidad(comunidadId: number): Promise<HabitanteOffline[]> {
    return this.db.habitantes.where('comunidadId').equals(comunidadId).toArray();
  }
}
