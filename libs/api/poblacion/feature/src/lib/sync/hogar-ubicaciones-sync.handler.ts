import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainSyncHandler,
  SyncHandlerRegistry,
  SyncOperacionEntrada,
  SyncResultadoOperacion,
} from '@censo/api-shared-feature';
import { AuthService } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RegistrarUbicacionHogarDto } from '@censo/api-georreferenciacion-feature';
import { HogarService } from '../services/hogar.service';

const DOMINIO = 'hogar-ubicaciones';

/**
 * Igual que HabitantesSyncHandler: el payload trae `hogarUuid` (el hogar
 * puede haberse creado en la misma sesión offline, sin `id` numérico aún).
 * No hay una identidad propia de "ubicación" que distinga crear/actualizar
 * (HogarService.registrarUbicacion ya hace upsert por hogarId), así que
 * ambas operaciones se resuelven igual.
 */
type UbicacionHogarPayloadSync = RegistrarUbicacionHogarDto & { hogarUuid: string };

@Injectable()
export class HogarUbicacionesSyncHandler implements DomainSyncHandler, OnModuleInit {
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
          mensaje: 'La ubicación de un hogar no se elimina por sync.',
        };
      }

      const payload = operacion.payload as unknown as UbicacionHogarPayloadSync;
      const hogar = await this.hogarService.obtenerPorUuid(payload.hogarUuid);
      if (!hogar) {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: `Hogar (uuid ${payload.hogarUuid}) aún no sincronizado; se reintentará`,
        };
      }

      const ubicacion = await this.hogarService.registrarUbicacion(hogar.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: { ...ubicacion } };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
