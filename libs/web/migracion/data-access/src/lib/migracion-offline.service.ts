import { Injectable } from '@angular/core';
import { AppDatabase, MovimientoMigratorioOffline, OfflineRepository, OperacionSync, SyncQueueService } from '@censo/web-shared-data-access';

/**
 * Envoltorio de dominio sobre OfflineRepository<MovimientoMigratorioOffline>
 * (RF-07-01). A diferencia de `EducacionOfflineService`/`EconomiaOfflineService`
 * (1:1 por habitante), un habitante puede tener múltiples eventos: no hay un
 * `obtenerPorHabitante` de un solo registro, sino `listarPorHabitante`
 * (filtra en memoria sobre `listar()`, igual que otros filtros offline del
 * proyecto — `OfflineRepository` no indexa por campos arbitrarios).
 */
@Injectable({ providedIn: 'root' })
export class MigracionOfflineService {
  private readonly repositorio: OfflineRepository<MovimientoMigratorioOffline>;

  constructor(db: AppDatabase, syncQueue: SyncQueueService) {
    this.repositorio = new OfflineRepository<MovimientoMigratorioOffline>(db.movimientosMigratorios, 'movimientos-migratorios', syncQueue);
  }

  async listarPorHabitante(habitanteUuid: string): Promise<MovimientoMigratorioOffline[]> {
    const todos = await this.repositorio.listar();
    return todos.filter((movimiento) => movimiento.habitanteUuid === habitanteUuid);
  }

  guardar(movimiento: MovimientoMigratorioOffline, operacion: OperacionSync = 'crear'): Promise<void> {
    return this.repositorio.guardar(movimiento, operacion);
  }
}
