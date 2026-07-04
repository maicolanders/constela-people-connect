import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainSyncHandler,
  SyncHandlerRegistry,
  SyncOperacionEntrada,
  SyncResultadoOperacion,
} from '@censo/api-shared-feature';
import { AuthService } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Hogar } from '@censo/api-poblacion-data-access';
import { ActualizarHogarDto } from '../dto/actualizar-hogar.dto';
import { CrearHogarDto } from '../dto/crear-hogar.dto';
import { HogarService } from '../services/hogar.service';

const DOMINIO = 'hogares';

/**
 * Primer consumidor real de SyncHandlerRegistry (Fase 0 lo dejó listo pero
 * sin implementaciones). Reutiliza AuthService.obtenerPerfil para reconstruir
 * el UsuarioAutenticado completo a partir del `usuarioId` que expone el
 * contrato de sync genérico (que no puede depender de domain:auth), y así
 * aplicar las mismas reglas de rol/comunidad que la vía REST directa.
 */
@Injectable()
export class HogaresSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly hogarService: HogarService,
    private readonly authService: AuthService,
    private readonly registry: SyncHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.registrar(DOMINIO, this);
  }

  async aplicarLote(operaciones: SyncOperacionEntrada[], usuarioId: number | null): Promise<SyncResultadoOperacion[]> {
    if (usuarioId === null) {
      return operaciones.map((operacion) => ({ uuid: operacion.uuid, estado: 'error', mensaje: 'Usuario no identificado' }));
    }

    const usuario = await this.authService.obtenerPerfil(usuarioId);
    const resultados: SyncResultadoOperacion[] = [];
    for (const operacion of operaciones) {
      resultados.push(await this.aplicarOperacion(operacion, usuario));
    }
    return resultados;
  }

  private async aplicarOperacion(
    operacion: SyncOperacionEntrada,
    usuario: UsuarioAutenticado,
  ): Promise<SyncResultadoOperacion> {
    try {
      if (operacion.operacion === 'eliminar') {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: 'Un hogar no se elimina por sync; use "dar de baja" (operación "actualizar").',
        };
      }

      if (operacion.operacion === 'crear') {
        const payload = operacion.payload as unknown as Omit<CrearHogarDto, 'uuid'>;
        const hogar = await this.hogarService.crear({ ...payload, uuid: operacion.uuid }, usuario);
        return { uuid: operacion.uuid, estado: 'aplicado', entidad: this.aRegistro(hogar) };
      }

      const existente = await this.hogarService.obtenerPorUuid(operacion.uuid);
      if (!existente) {
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Hogar no encontrado para actualizar' };
      }

      if (this.hayConflicto(existente, operacion.actualizadoEnCliente)) {
        return { uuid: operacion.uuid, estado: 'conflicto', entidad: this.aRegistro(existente) };
      }

      const payload = operacion.payload as unknown as ActualizarHogarDto;
      const hogar = await this.hogarService.actualizar(existente.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: this.aRegistro(hogar) };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  private hayConflicto(existente: Hogar, actualizadoEnCliente: string): boolean {
    return existente.updatedAt.toISOString() > actualizadoEnCliente;
  }

  private aRegistro(hogar: Hogar): Record<string, unknown> {
    return { ...hogar };
  }
}
