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
import { CrearHabitanteOcupacionDto } from '../dto/crear-habitante-ocupacion.dto';
import { EconomiaService } from '../services/economia.service';

const DOMINIO = 'ocupaciones';

/** Igual que EducacionSyncHandler (Fase 5): el payload trae `habitanteUuid`. */
type EconomiaPayloadSync = CrearHabitanteOcupacionDto & { habitanteUuid: string };

@Injectable()
export class EconomiaSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly economiaService: EconomiaService,
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
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Un registro de ocupación no se elimina por sync.' };
      }

      const payload = operacion.payload as unknown as EconomiaPayloadSync;
      const habitante = await this.habitanteService.obtenerPorUuid(payload.habitanteUuid);
      if (!habitante) {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: `Habitante (uuid ${payload.habitanteUuid}) aún no sincronizado; se reintentará`,
        };
      }

      const ocupacion = await this.economiaService.crearParaHabitante(habitante.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: { ...ocupacion } };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
