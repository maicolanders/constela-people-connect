import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainSyncHandler,
  SyncHandlerRegistry,
  SyncOperacionEntrada,
  SyncResultadoOperacion,
} from '@censo/api-shared-feature';
import { AuthService } from '@censo/api-auth-feature';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { CrearMovimientoMigratorioDto } from '../dto/crear-movimiento-migratorio.dto';
import { MigracionService } from '../services/migracion.service';

const DOMINIO = 'movimientos-migratorios';

/**
 * A diferencia de EducacionSyncHandler/EconomiaSyncHandler (1:1 por
 * habitante), cada evento migratorio tiene su propio `uuid` — el payload
 * trae `habitanteUuid` a resolver (el `periodoCensalId` ya viene dentro del
 * propio DTO, es un campo del evento, no del habitante).
 */
type MigracionPayloadSync = CrearMovimientoMigratorioDto & { habitanteUuid: string };

@Injectable()
export class MigracionSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly migracionService: MigracionService,
    private readonly habitanteService: HabitanteService,
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
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Un movimiento migratorio no se elimina por sync.' };
      }

      const payload = operacion.payload as unknown as MigracionPayloadSync;
      const habitante = await this.habitanteService.obtenerPorUuid(payload.habitanteUuid);
      if (!habitante) {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: `Habitante (uuid ${payload.habitanteUuid}) aún no sincronizado; se reintentará`,
        };
      }

      const movimiento = await this.migracionService.crearParaHabitante(habitante.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: { ...movimiento } };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
