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
import { CrearHabitanteEducacionDto } from '../dto/crear-habitante-educacion.dto';
import { EducacionService } from '../services/educacion.service';

const DOMINIO = 'educaciones';

/** Igual que ViviendaSyncHandler (Fase 4): el payload trae `habitanteUuid` (el habitante puede haberse creado en la misma sesión offline). */
type EducacionPayloadSync = CrearHabitanteEducacionDto & { habitanteUuid: string };

@Injectable()
export class EducacionSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly educacionService: EducacionService,
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
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Un registro de educación no se elimina por sync.' };
      }

      const payload = operacion.payload as unknown as EducacionPayloadSync;
      const habitante = await this.habitanteService.obtenerPorUuid(payload.habitanteUuid);
      if (!habitante) {
        return {
          uuid: operacion.uuid,
          estado: 'error',
          mensaje: `Habitante (uuid ${payload.habitanteUuid}) aún no sincronizado; se reintentará`,
        };
      }

      const educacion = await this.educacionService.crearParaHabitante(habitante.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: { ...educacion } };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
