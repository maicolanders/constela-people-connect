import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { comunidadesPermitidas } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { aplicarAnonimizacionKAnonimity } from '@censo/shared-util';
import { DataSource, In, Repository } from 'typeorm';
import { ComparacionHistoricaQueryDto } from '../dto/comparacion-historica-query.dto';

export interface PuntoComparacionDto {
  periodoCensalId: number;
  periodoNombre: string;
  poblacionTotal: number | null;
  coberturaServiciosPromedio: number | null;
  suprimido: boolean;
}

export interface ComparacionComunidadDto {
  comunidadId: number;
  comunidadNombre: string;
  puntos: PuntoComparacionDto[];
}

const UMBRAL_K_ANONIMITY = 5;

interface FilaComunidad {
  id: number;
  nombre: string;
}

interface FilaPoblacion {
  comunidad_id: number;
  periodo_censal_id: number;
  poblacion_total: string;
}

interface FilaCobertura {
  comunidad_id: number;
  periodo_censal_id: number;
  con_acceso: string;
  total: string;
}

/**
 * RF-10-02: series de tiempo de "crecimiento poblacional" y "variación de
 * cobertura de servicios" (los dos ejemplos citados explícitamente en el
 * requerimiento) entre 2+ periodos, por comunidad. `domain:periodo-censal`
 * no puede depender de `domain:comunidad`/`domain:vivienda`/`domain:demografia`
 * (ver eslint.config.mjs) — se resuelve con SQL directo contra las tablas
 * por nombre (mismo patrón que Fase 9, `IndicadoresRecursosService`),
 * reutilizando la vista materializada de indicadores demográficos
 * (`mv_indicadores_demograficos_periodo`, Fase 2) para población en vez de
 * recalcularla. Solo hay dato de población para periodos ya CERRADOS (la
 * vista solo se refresca al cierre); un periodo sin snapshot se reporta con
 * `poblacionTotal: null` (falta de dato, no supresión).
 */
@Injectable()
export class ComparacionHistoricaService {
  constructor(
    @InjectRepository(PeriodoCensal) private readonly periodoRepository: Repository<PeriodoCensal>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async comparar(usuario: UsuarioAutenticado, dto: ComparacionHistoricaQueryDto): Promise<ComparacionComunidadDto[]> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);
    const periodos = await this.periodoRepository.find({ where: { id: In(dto.periodoCensalIds) } });
    const nombrePorPeriodo = new Map(periodos.map((p) => [p.id, p.nombre]));

    const comunidades = await this.obtenerComunidades(permitido, dto.comunidadId);
    if (comunidades.length === 0) {
      return [];
    }
    const comunidadIds = comunidades.map((c) => c.id);

    const [filasPoblacion, filasCobertura] = await Promise.all([
      this.obtenerPoblacionPorComunidadYPeriodo(dto.periodoCensalIds, comunidadIds),
      this.obtenerCoberturaPorComunidadYPeriodo(dto.periodoCensalIds, comunidadIds),
    ]);

    const poblacionPorClave = new Map(
      filasPoblacion.map((fila) => [`${fila.comunidad_id}:${fila.periodo_censal_id}`, parseInt(fila.poblacion_total, 10)]),
    );
    const coberturaPorClave = new Map(
      filasCobertura.map((fila) => {
        const total = parseInt(fila.total, 10);
        const conAcceso = parseInt(fila.con_acceso, 10);
        return [`${fila.comunidad_id}:${fila.periodo_censal_id}`, total > 0 ? this.redondear((conAcceso / total) * 100) : null];
      }),
    );

    return comunidades.map((comunidad) => {
      const puntosSinAnonimizar = dto.periodoCensalIds.map((periodoCensalId) => {
        const clave = `${comunidad.id}:${periodoCensalId}`;
        const poblacionTotal = poblacionPorClave.get(clave) ?? null;
        return {
          periodoCensalId,
          periodoNombre: nombrePorPeriodo.get(periodoCensalId) ?? `Periodo ${periodoCensalId}`,
          total: poblacionTotal ?? 0,
          tieneSnapshot: poblacionPorClave.has(clave),
          coberturaServiciosPromedio: coberturaPorClave.get(clave) ?? null,
        };
      });

      const anonimizados = aplicarAnonimizacionKAnonimity(puntosSinAnonimizar, { umbralMinimo: UMBRAL_K_ANONIMITY });

      return {
        comunidadId: comunidad.id,
        comunidadNombre: comunidad.nombre,
        puntos: anonimizados.map((punto) => ({
          periodoCensalId: punto['periodoCensalId'] as number,
          periodoNombre: punto['periodoNombre'] as string,
          poblacionTotal: punto['tieneSnapshot'] ? punto.total : null,
          coberturaServiciosPromedio: punto.suprimido ? null : (punto['coberturaServiciosPromedio'] as number | null),
          suprimido: punto.suprimido,
        })),
      };
    });
  }

  private async obtenerComunidades(
    permitido: 'global' | number[],
    comunidadId: number | undefined,
  ): Promise<FilaComunidad[]> {
    if (permitido !== 'global' && permitido.length === 0) {
      return [];
    }
    if (comunidadId !== undefined) {
      if (permitido !== 'global' && !permitido.includes(comunidadId)) {
        return [];
      }
      return this.dataSource.query<FilaComunidad[]>(
        `SELECT id, nombre FROM comunidades WHERE id = $1 AND deleted_at IS NULL`,
        [comunidadId],
      );
    }
    if (permitido === 'global') {
      return this.dataSource.query<FilaComunidad[]>(
        `SELECT id, nombre FROM comunidades WHERE deleted_at IS NULL ORDER BY nombre`,
      );
    }
    return this.dataSource.query<FilaComunidad[]>(
      `SELECT id, nombre FROM comunidades WHERE id = ANY($1) AND deleted_at IS NULL ORDER BY nombre`,
      [permitido],
    );
  }

  private obtenerPoblacionPorComunidadYPeriodo(periodoCensalIds: number[], comunidadIds: number[]): Promise<FilaPoblacion[]> {
    return this.dataSource.query<FilaPoblacion[]>(
      `SELECT comunidad_id, periodo_censal_id, poblacion_total
       FROM mv_indicadores_demograficos_periodo
       WHERE periodo_censal_id = ANY($1) AND comunidad_id = ANY($2)`,
      [periodoCensalIds, comunidadIds],
    );
  }

  private obtenerCoberturaPorComunidadYPeriodo(periodoCensalIds: number[], comunidadIds: number[]): Promise<FilaCobertura[]> {
    return this.dataSource.query<FilaCobertura[]>(
      `SELECT h.comunidad_id AS comunidad_id, h.periodo_censal_id AS periodo_censal_id,
              COUNT(*) FILTER (WHERE vs.estado = 'si') AS con_acceso, COUNT(*) AS total
       FROM hogares h
       JOIN vivienda_servicios vs ON vs.vivienda_id = h.vivienda_id
       WHERE h.periodo_censal_id = ANY($1) AND h.comunidad_id = ANY($2) AND h.deleted_at IS NULL
       GROUP BY h.comunidad_id, h.periodo_censal_id`,
      [periodoCensalIds, comunidadIds],
    );
  }

  private redondear(valor: number): number {
    return Math.round(valor * 10) / 10;
  }
}
