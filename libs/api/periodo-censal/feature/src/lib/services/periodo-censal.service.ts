import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Auditoria } from '@censo/api-shared-data-access';
import { PeriodoCierreHookRegistry } from '@censo/api-shared-feature';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { Repository } from 'typeorm';
import { CrearPeriodoCensalDto } from '../dto/crear-periodo-censal.dto';

export interface OpcionesAssertAbierto {
  /** Justificación obligatoria para permitir una corrección administrativa excepcional. */
  justificacionAdministrativa?: string;
  usuarioEsAdministrador?: boolean;
  usuarioId?: number | null;
}

@Injectable()
export class PeriodoCensalService {
  constructor(
    @InjectRepository(PeriodoCensal) private readonly periodoRepository: Repository<PeriodoCensal>,
    @InjectRepository(Auditoria) private readonly auditoriaRepository: Repository<Auditoria>,
    private readonly periodoCierreHookRegistry: PeriodoCierreHookRegistry,
  ) {}

  listar(): Promise<PeriodoCensal[]> {
    return this.periodoRepository.find({ order: { fechaInicio: 'DESC' } });
  }

  async obtener(id: number): Promise<PeriodoCensal> {
    const periodo = await this.periodoRepository.findOne({ where: { id } });
    if (!periodo) {
      throw new NotFoundException(`Periodo censal ${id} no encontrado`);
    }
    return periodo;
  }

  crear(dto: CrearPeriodoCensalDto): Promise<PeriodoCensal> {
    return this.periodoRepository.save(
      this.periodoRepository.create({ ...dto, estado: EstadoPeriodo.PLANEADO }),
    );
  }

  async abrir(id: number): Promise<PeriodoCensal> {
    const periodo = await this.obtener(id);
    if (periodo.estado !== EstadoPeriodo.PLANEADO) {
      throw new ForbiddenException('Solo un periodo planeado puede abrirse');
    }
    periodo.estado = EstadoPeriodo.ABIERTO;
    return this.periodoRepository.save(periodo);
  }

  async cerrar(id: number): Promise<PeriodoCensal> {
    const periodo = await this.obtener(id);
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      throw new ForbiddenException('Solo un periodo abierto puede cerrarse');
    }
    periodo.estado = EstadoPeriodo.CERRADO;
    periodo.fechaCierre = new Date().toISOString().slice(0, 10);
    const guardado = await this.periodoRepository.save(periodo);

    // RF-02-03: los indicadores demográficos (y cualquier otro artefacto de
    // cierre futuro) se recalculan aquí, sin que este servicio conozca a sus
    // consumidores (ver PeriodoCierreHookRegistry).
    await this.periodoCierreHookRegistry.ejecutarTodos(guardado.id);

    return guardado;
  }

  /** Implementa PeriodoEstadoProvider (contrato consumido por PeriodoAbiertoGuard). */
  async obtenerEstado(periodoCensalId: number): Promise<EstadoPeriodo> {
    const periodo = await this.obtener(periodoCensalId);
    return periodo.estado;
  }

  /**
   * Guardia de negocio para servicios de dominio (Fase 1+): bloquea escritura
   * de nuevas versiones sobre un periodo cerrado, salvo corrección
   * administrativa excepcional con justificación, que además queda auditada.
   */
  async assertAbierto(periodoCensalId: number, opciones: OpcionesAssertAbierto = {}): Promise<void> {
    const periodo = await this.obtener(periodoCensalId);
    if (periodo.estado === EstadoPeriodo.ABIERTO) {
      return;
    }

    const excepcionValida = Boolean(opciones.usuarioEsAdministrador && opciones.justificacionAdministrativa);
    if (!excepcionValida) {
      throw new ForbiddenException('El periodo censal no está abierto para registrar o modificar información');
    }

    await this.auditoriaRepository.save(
      this.auditoriaRepository.create({
        tabla: 'periodos_censales',
        registroId: periodo.id,
        campo: 'justificacion_override',
        valorAnterior: null,
        valorNuevo: opciones.justificacionAdministrativa ?? null,
        accion: 'actualizar',
        usuarioId: opciones.usuarioId ?? null,
        fechaHora: new Date(),
      }),
    );
  }
}
