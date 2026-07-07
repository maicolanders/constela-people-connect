import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainSyncHandler,
  SyncHandlerRegistry,
  SyncOperacionEntrada,
  SyncResultadoOperacion,
} from '@censo/api-shared-feature';
import { AuthService } from '@censo/api-auth-feature';
import { HogarService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { CrearViviendaDto } from '../dto/crear-vivienda.dto';
import { ViviendaService } from '../services/vivienda.service';

const DOMINIO = 'viviendas';

/**
 * Igual que HogarUbicacionesSyncHandler (Fase 3): el payload trae `hogarUuid`
 * (el hogar puede haberse creado en la misma sesión offline). A diferencia de
 * la ubicación, la vivienda no admite upsert por sync (crearParaHogar
 * rechaza si el hogar ya tiene una; ver nota en el servicio) — igual de
 * estricto que HabitantesSyncHandler con "eliminar".
 */
type ViviendaPayloadSync = CrearViviendaDto & { hogarUuid: string };

@Injectable()
export class ViviendaSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly viviendaService: ViviendaService,
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
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Una vivienda no se elimina por sync.' };
      }

      const payload = operacion.payload as unknown as ViviendaPayloadSync;
      const hogar = await this.hogarService.obtenerPorUuid(payload.hogarUuid);
      if (!hogar) {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: `Hogar (uuid ${payload.hogarUuid}) aún no sincronizado; se reintentará`,
        };
      }

      const vivienda = await this.viviendaService.crearParaHogar(hogar.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: { ...vivienda } };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
