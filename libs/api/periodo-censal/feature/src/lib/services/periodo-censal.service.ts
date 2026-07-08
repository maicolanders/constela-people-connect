import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Auditoria } from '@censo/api-shared-data-access';
import { PeriodoCierreHookRegistry } from '@censo/api-shared-feature';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { DataSource, Repository } from 'typeorm';
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
    @InjectDataSource() private readonly dataSource: DataSource,
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

  /**
   * RF-10-01 (criterio 2): "iniciar un nuevo periodo censal partiendo de la
   * base poblacional vigente (para actualización, no recaptura total)".
   * Solo puede partir de un periodo ya CERRADO (su base quedó congelada);
   * el nuevo queda ABIERTO de inmediato y encadenado vía `periodoOrigenId`.
   *
   * `domain:periodo-censal` no puede depender de `domain:poblacion` (ver
   * eslint.config.mjs) — la "copia" no es un INSERT de filas nuevas: hogares
   * y habitantes son entidades de una sola fila por identidad (alta/baja,
   * ver Hogar/Habitante), así que "partir de la base vigente" se resuelve
   * reasignando hacia adelante el `periodo_censal_id` de los registros
   * ACTIVOS del periodo origen (UPDATE por SQL directo, sin importar las
   * entidades), lo que los saca del estado "congelado" (assertAbierto se
   * evalúa contra el periodo propio de cada registro) y los deja editables
   * en el nuevo periodo sin que el censista tenga que volver a capturarlos.
   * Los registros dados de baja permanecen en su periodo original (ya son
   * historia, no "vigente"). Datos satélite versionados de otros dominios
   * (vivienda, educación, economía, parentesco, etnia, migración) NO se
   * mueven automáticamente: cada uno ya modela su dato como "puede cambiar
   * entre periodos" y se re-captura/actualiza explícitamente en el nuevo
   * periodo — moverlos también ampliaría el alcance de esta fase a 6+
   * dominios sin que ningún RF de MOD-10 lo pida.
   */
  async iniciarNuevoPeriodo(periodoOrigenId: number, dto: CrearPeriodoCensalDto): Promise<PeriodoCensal> {
    const origen = await this.obtener(periodoOrigenId);
    if (origen.estado !== EstadoPeriodo.CERRADO) {
      throw new ForbiddenException('Solo se puede iniciar un nuevo periodo a partir de uno ya cerrado');
    }

    const nuevo = await this.periodoRepository.save(
      this.periodoRepository.create({ ...dto, estado: EstadoPeriodo.PLANEADO, periodoOrigenId }),
    );
    const abierto = await this.abrir(nuevo.id);
    await this.copiarBasePoblacionalVigente(periodoOrigenId, abierto.id);
    return abierto;
  }

  private async copiarBasePoblacionalVigente(periodoOrigenId: number, periodoNuevoId: number): Promise<void> {
    await this.dataSource.query(
      `UPDATE hogares SET periodo_censal_id = $2 WHERE periodo_censal_id = $1 AND estado = 'activo' AND deleted_at IS NULL`,
      [periodoOrigenId, periodoNuevoId],
    );
    await this.dataSource.query(
      `UPDATE habitantes SET periodo_censal_id = $2 WHERE periodo_censal_id = $1 AND estado = 'activo' AND deleted_at IS NULL`,
      [periodoOrigenId, periodoNuevoId],
    );
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
