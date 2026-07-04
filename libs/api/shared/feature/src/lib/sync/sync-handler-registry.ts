import { Injectable } from '@nestjs/common';
import { DomainSyncHandler } from './sync.types';

/**
 * Registro genérico de handlers de sincronización por dominio. Cada módulo
 * de dominio (hogares, habitantes, viviendas, ...) se registra aquí desde su
 * propio módulo (onModuleInit) en vez de que shared/feature importe los
 * dominios concretos, para no violar los depConstraints de Nx.
 */
@Injectable()
export class SyncHandlerRegistry {
  private readonly handlers = new Map<string, DomainSyncHandler>();

  registrar(dominio: string, handler: DomainSyncHandler): void {
    this.handlers.set(dominio, handler);
  }

  obtener(dominio: string): DomainSyncHandler | undefined {
    return this.handlers.get(dominio);
  }
}
