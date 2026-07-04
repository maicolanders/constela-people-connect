import { Body, Controller, NotFoundException, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SyncHandlerRegistry } from './sync-handler-registry';
import { SyncOperacionEntrada, SyncResultadoOperacion } from './sync.types';

interface RequestConUsuario extends Request {
  user?: { id?: number };
}

@Controller('sync')
export class SyncController {
  constructor(private readonly registry: SyncHandlerRegistry) {}

  @Post(':dominio')
  async sincronizar(
    @Param('dominio') dominio: string,
    @Body() operaciones: SyncOperacionEntrada[],
    @Req() request: RequestConUsuario,
  ): Promise<SyncResultadoOperacion[]> {
    const handler = this.registry.obtener(dominio);
    if (!handler) {
      throw new NotFoundException(`No hay sincronización registrada para el dominio "${dominio}"`);
    }

    return handler.aplicarLote(operaciones, request.user?.id ?? null);
  }
}
