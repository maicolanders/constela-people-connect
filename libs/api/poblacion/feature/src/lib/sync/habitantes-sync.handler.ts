import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  DomainSyncHandler,
  SyncHandlerRegistry,
  SyncOperacionEntrada,
  SyncResultadoOperacion,
} from '@censo/api-shared-feature';
import { AuthService } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { ActualizarHabitanteDto } from '../dto/actualizar-habitante.dto';
import { CrearHabitanteDto } from '../dto/crear-habitante.dto';
import { HabitanteService } from '../services/habitante.service';
import { HogarService } from '../services/hogar.service';

const DOMINIO = 'habitantes';

/**
 * El payload de "crear" que envía el cliente offline no conoce el `id`
 * numérico del hogar (puede haberse creado en la misma sesión, antes de
 * cualquier sincronización): trae `hogarUuid` en su lugar. Este handler lo
 * resuelve contra los hogares ya sincronizados; si el hogar todavía no
 * existe en el servidor, la operación queda en estado 'error' para que el
 * outbox del cliente la reintente en el próximo ciclo (no se asume ningún
 * orden estricto entre los dominios 'hogares' y 'habitantes' del lote).
 */
type CrearHabitantePayloadSync = Omit<CrearHabitanteDto, 'hogarId' | 'uuid'> & { hogarUuid: string };

@Injectable()
export class HabitantesSyncHandler implements DomainSyncHandler, OnModuleInit {
  constructor(
    private readonly habitanteService: HabitanteService,
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
          mensaje: 'Un habitante no se elimina por sync; use "dar de baja" (operación "actualizar").',
        };
      }

      if (operacion.operacion === 'crear') {
        return this.crear(operacion, usuario);
      }

      const existente = await this.habitanteService.obtenerPorUuid(operacion.uuid);
      if (!existente) {
        return { uuid: operacion.uuid, estado: 'error', mensaje: 'Habitante no encontrado para actualizar' };
      }

      if (this.hayConflicto(existente, operacion.actualizadoEnCliente)) {
        return { uuid: operacion.uuid, estado: 'conflicto', entidad: this.aRegistro(existente) };
      }

      const payload = operacion.payload as unknown as ActualizarHabitanteDto;
      const habitante = await this.habitanteService.actualizar(existente.id, payload, usuario);
      return { uuid: operacion.uuid, estado: 'aplicado', entidad: this.aRegistro(habitante) };
    } catch (error) {
      return { uuid: operacion.uuid, estado: 'error', mensaje: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }

  private async crear(operacion: SyncOperacionEntrada, usuario: UsuarioAutenticado): Promise<SyncResultadoOperacion> {
    const payload = operacion.payload as unknown as CrearHabitantePayloadSync;
    const hogar = await this.hogarService.obtenerPorUuid(payload.hogarUuid);
    if (!hogar) {
      return {
        uuid: operacion.uuid,
        estado: 'error',
        mensaje: `Hogar (uuid ${payload.hogarUuid}) aún no sincronizado; se reintentará`,
      };
    }

    const dto: CrearHabitanteDto = {
      uuid: operacion.uuid,
      hogarId: hogar.id,
      periodoCensalId: payload.periodoCensalId,
      nombres: payload.nombres,
      apellidos: payload.apellidos,
      tipoDocumentoId: payload.tipoDocumentoId,
      numeroDocumento: payload.numeroDocumento,
      fechaNacimiento: payload.fechaNacimiento,
      sexo: payload.sexo,
      consentimientoInformado: payload.consentimientoInformado,
      consentimientoFecha: payload.consentimientoFecha,
      parentescoCatalogoItemId: payload.parentescoCatalogoItemId,
      revisionesDuplicado: payload.revisionesDuplicado,
    };
    const habitante = await this.habitanteService.crear(dto, usuario);
    return { uuid: operacion.uuid, estado: 'aplicado', entidad: this.aRegistro(habitante) };
  }

  private hayConflicto(existente: Habitante, actualizadoEnCliente: string): boolean {
    return existente.updatedAt.toISOString() > actualizadoEnCliente;
  }

  private aRegistro(habitante: Habitante): Record<string, unknown> {
    return { ...habitante };
  }
}
