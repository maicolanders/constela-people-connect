import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { IndicadorDemograficoPeriodo } from '@censo/api-demografia-data-access';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { PeriodoCierreHook, PeriodoCierreHookRegistry } from '@censo/api-shared-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { calcularIndiceEnvejecimiento, calcularRazonDependencia, calcularTasaPorMil } from '@censo/shared-util';
import { DataSource, Repository } from 'typeorm';
import { DemografiaQueryDto } from '../dto/demografia-query.dto';

export interface IndicadoresDemograficosDto {
  comunidadId: number;
  periodoCensalId: number;
  poblacionTotal: number | null;
  razonDependencia: number | null;
  indiceEnvejecimiento: number | null;
  tasaNatalidadAparente: number | null;
  tasaMortalidadAparente: number | null;
  suprimido: boolean;
}

/** Mismo umbral por defecto que aplicarAnonimizacionKAnonimity (libs/shared/util). */
const UMBRAL_K_ANONIMITY = 5;

/**
 * RF-02-03: los indicadores demográficos son un artefacto de cierre de
 * periodo, no una vista en vivo (a diferencia de la pirámide) — solo existen
 * para periodos `cerrado`, leídos desde la vista materializada que este
 * mismo servicio refresca al cerrarse un periodo (PeriodoCierreHookRegistry).
 */
@Injectable()
export class IndicadoresDemograficosService implements PeriodoCierreHook, OnModuleInit {
  constructor(
    @InjectRepository(IndicadorDemograficoPeriodo)
    private readonly vistaRepository: Repository<IndicadorDemograficoPeriodo>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly periodoCensalService: PeriodoCensalService,
    private readonly periodoCierreHookRegistry: PeriodoCierreHookRegistry,
  ) {}

  onModuleInit(): void {
    this.periodoCierreHookRegistry.registrar(this);
  }

  async alCerrarPeriodo(): Promise<void> {
    await this.dataSource.query('REFRESH MATERIALIZED VIEW mv_indicadores_demograficos_periodo');
  }

  async obtener(usuario: UsuarioAutenticado, dto: DemografiaQueryDto): Promise<IndicadoresDemograficosDto> {
    this.verificarAcceso(dto.comunidadId, usuario);

    const periodo = await this.periodoCensalService.obtener(dto.periodoCensalId);
    if (periodo.estado !== EstadoPeriodo.CERRADO) {
      throw new NotFoundException('Los indicadores demográficos se calculan al cerrar el periodo censal');
    }

    const fila = await this.vistaRepository.findOne({
      where: { comunidadId: dto.comunidadId, periodoCensalId: dto.periodoCensalId },
    });

    if (!fila || fila.poblacionTotal === 0) {
      return this.respuestaVacia(dto);
    }

    if (fila.poblacionTotal < UMBRAL_K_ANONIMITY) {
      return { ...this.respuestaVacia(dto), poblacionTotal: null, suprimido: true };
    }

    return {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      poblacionTotal: fila.poblacionTotal,
      razonDependencia: this.calcularSeguro(() =>
        calcularRazonDependencia(fila.poblacion0a14, fila.poblacion65Mas, fila.poblacion15a64),
      ),
      indiceEnvejecimiento: this.calcularSeguro(() => calcularIndiceEnvejecimiento(fila.poblacion65Mas, fila.poblacion0a14)),
      tasaNatalidadAparente: this.calcularSeguro(() => calcularTasaPorMil(fila.altasPeriodo, fila.poblacionTotal)),
      tasaMortalidadAparente: this.calcularSeguro(() => calcularTasaPorMil(fila.defuncionesPeriodo, fila.poblacionTotal)),
      suprimido: false,
    };
  }

  private respuestaVacia(dto: DemografiaQueryDto): IndicadoresDemograficosDto {
    return {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      poblacionTotal: 0,
      razonDependencia: null,
      indiceEnvejecimiento: null,
      tasaNatalidadAparente: null,
      tasaMortalidadAparente: null,
      suprimido: false,
    };
  }

  /** Denominador 0 (p.ej. sin población 15-64 en comunidades muy pequeñas) -> indicador no aplicable, no error. */
  private calcularSeguro(fn: () => number): number | null {
    try {
      return fn();
    } catch {
      return null;
    }
  }

  private verificarAcceso(comunidadId: number, usuario: UsuarioAutenticado): void {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }
  }
}
