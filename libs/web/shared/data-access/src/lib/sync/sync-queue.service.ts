import { Injectable } from '@angular/core';
import { AppDatabase, ColaSincronizacionEntrada, OperacionSync } from '../database/app-database';

/**
 * Outbox de sincronización offline->online (RT-03). Encapsula todo el acceso
 * a la tabla `colaSincronizacion`; SyncService es el único consumidor que
 * decide cuándo drenarla.
 */
@Injectable({ providedIn: 'root' })
export class SyncQueueService {
  constructor(private readonly db: AppDatabase) {}

  async encolar(
    dominio: string,
    uuid: string,
    operacion: OperacionSync,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const existente = await this.db.colaSincronizacion
      .where('[dominio+uuid]')
      .equals([dominio, uuid])
      .filter((entrada) => entrada.estado === 'pendiente')
      .first();

    if (existente?.id !== undefined) {
      await this.db.colaSincronizacion.update(existente.id, {
        operacion,
        payload,
        creadoEn: new Date().toISOString(),
      });
      return;
    }

    await this.db.colaSincronizacion.add({
      dominio,
      uuid,
      operacion,
      payload,
      actualizadoEnCliente: new Date().toISOString(),
      estado: 'pendiente',
      intentos: 0,
      creadoEn: new Date().toISOString(),
    });
  }

  listarPendientes(): Promise<ColaSincronizacionEntrada[]> {
    return this.db.colaSincronizacion.where('estado').equals('pendiente').toArray();
  }

  listarConflictos(): Promise<ColaSincronizacionEntrada[]> {
    return this.db.colaSincronizacion.where('estado').equals('conflicto').toArray();
  }

  async marcarSincronizado(id: number): Promise<void> {
    await this.db.colaSincronizacion.delete(id);
  }

  async marcarConflicto(id: number, entidadServidor: Record<string, unknown>): Promise<void> {
    await this.db.colaSincronizacion.update(id, { estado: 'conflicto', entidadServidor });
  }

  async marcarError(id: number, mensaje: string): Promise<void> {
    const entrada = await this.db.colaSincronizacion.get(id);
    await this.db.colaSincronizacion.update(id, {
      estado: 'error',
      mensaje,
      intentos: (entrada?.intentos ?? 0) + 1,
    });
  }

  /** El usuario resolvió manualmente un conflicto: vuelve a quedar pendiente con el payload elegido. */
  async resolverConflictoManual(id: number, payloadResuelto: Record<string, unknown>): Promise<void> {
    await this.db.colaSincronizacion.update(id, {
      estado: 'pendiente',
      payload: payloadResuelto,
      entidadServidor: undefined,
      mensaje: undefined,
    });
  }
}
