import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ComunidadService } from '@censo/api-comunidad-feature';
import { comunidadesPermitidas } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoServicio } from '@censo/shared-data-access';
import {
  aplicarAnonimizacionKAnonimity,
  calcularNbi,
} from '@censo/shared-util';
import { DataSource } from 'typeorm';
import { IndicadoresRecursosQueryDto } from '../dto/indicadores-recursos-query.dto';

export interface IndicadorComunidadDto {
  comunidadId: number;
  comunidadNombre: string;
  poblacionTotal: number | null;
  tasaNbi: number | null;
  coberturaEducativa: number | null;
  tasaVulnerabilidad: number | null;
  suprimido: boolean;
}

export interface IndicadoresRecursosDto {
  periodoCensalId: number;
  comunidades: IndicadorComunidadDto[];
}

interface FilaHogarNbi {
  comunidad_id: number;
  habitantes_activos: string;
  numero_dormitorios: number;
  tipo_vivienda_codigo: string | null;
  material_pared_codigo: string | null;
  material_piso_codigo: string | null;
  agua_estado: string;
  saneamiento_estado: string;
}

/**
 * RF-09-01: panel de comparación entre comunidades. `domain:recursos` NO
 * puede depender de `domain:poblacion`/`domain:vivienda`/`domain:educacion`/
 * `domain:etnia-vulnerabilidad` (ver eslint.config.mjs) — los 4 indicadores
 * se calculan con SQL directo (`dataSource.query`, sin importar entidades de
 * esos dominios) contra las tablas ya existentes, reutilizando `calcularNbi`
 * de `shared/util` para no duplicar la fórmula de NBI de `HacinamientoNbiService`
 * (Fase 4). En vivo, sin vista materializada — mismo criterio que Fases 4/6/7/8
 * (RF-09-01 no exige "solo periodos cerrados").
 *
 * "Región" (RF-09-01) sigue sin implementarse — mismo alcance no cubierto que
 * en Fases 1/4/8: el panel compara comunidades individuales, no agregados
 * regionales.
 */
@Injectable()
export class IndicadoresRecursosService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly comunidadService: ComunidadService,
  ) {}

  async obtener(
    usuario: UsuarioAutenticado,
    dto: IndicadoresRecursosQueryDto,
  ): Promise<IndicadoresRecursosDto> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);
    const todasLasComunidades = await this.comunidadService.listar();
    const comunidades =
      permitido === 'global'
        ? todasLasComunidades
        : todasLasComunidades.filter((c) => permitido.includes(c.id));

    if (comunidades.length === 0) {
      return { periodoCensalId: dto.periodoCensalId, comunidades: [] };
    }

    const comunidadIds = comunidades.map((c) => c.id);

    const [
      poblacionPorComunidad,
      filasNbi,
      educacionPorComunidad,
      vulnerabilidadPorComunidad,
    ] = await Promise.all([
      this.obtenerPoblacionPorComunidad(dto.periodoCensalId, comunidadIds),
      this.obtenerFilasNbi(dto.periodoCensalId, comunidadIds),
      this.obtenerCoberturaEducativaPorComunidad(
        dto.periodoCensalId,
        comunidadIds,
      ),
      this.obtenerVulnerabilidadPorComunidad(dto.periodoCensalId, comunidadIds),
    ]);

    const nbiPorComunidad = this.calcularTasaNbiPorComunidad(filasNbi);

    const filas = comunidades.map((comunidad) => {
      const poblacionTotal = poblacionPorComunidad.get(comunidad.id) ?? 0;
      const educacion = educacionPorComunidad.get(comunidad.id);
      const conCondicion = vulnerabilidadPorComunidad.get(comunidad.id) ?? 0;

      return {
        comunidadId: comunidad.id,
        comunidadNombre: comunidad.nombre,
        total: poblacionTotal,
        tasaNbi: nbiPorComunidad.get(comunidad.id) ?? null,
        coberturaEducativa:
          educacion && educacion.totalConDato > 0
            ? this.redondear((educacion.asisten / educacion.totalConDato) * 100)
            : null,
        tasaVulnerabilidad:
          poblacionTotal > 0
            ? this.redondear((conCondicion / poblacionTotal) * 100)
            : null,
      };
    });

    const filasAnonimizadas = aplicarAnonimizacionKAnonimity(filas);

    return {
      periodoCensalId: dto.periodoCensalId,
      comunidades: filasAnonimizadas.map((fila) => ({
        comunidadId: fila['comunidadId'] as number,
        comunidadNombre: fila['comunidadNombre'] as string,
        poblacionTotal: fila.total,
        // Si la comunidad se suprime por tamaño de muestra, se anulan también las tasas derivadas (evita deducir la población por cálculo inverso).
        tasaNbi: fila.suprimido ? null : (fila['tasaNbi'] as number | null),
        coberturaEducativa: fila.suprimido
          ? null
          : (fila['coberturaEducativa'] as number | null),
        tasaVulnerabilidad: fila.suprimido
          ? null
          : (fila['tasaVulnerabilidad'] as number | null),
        suprimido: fila.suprimido,
      })),
    };
  }

  private redondear(valor: number): number {
    return Math.round(valor * 10) / 10;
  }

  private async obtenerPoblacionPorComunidad(
    periodoCensalId: number,
    comunidadIds: number[],
  ): Promise<Map<number, number>> {
    const filas: { comunidad_id: number; total: string }[] =
      await this.dataSource.query(
        `SELECT comunidad_id, COUNT(*) as total FROM habitantes
       WHERE periodo_censal_id = $1 AND estado = 'activo' AND comunidad_id = ANY($2::int[])
       GROUP BY comunidad_id`,
        [periodoCensalId, comunidadIds],
      );
    return new Map(
      filas.map((fila) => [fila.comunidad_id, Number(fila.total)]),
    );
  }

  private async obtenerFilasNbi(
    periodoCensalId: number,
    comunidadIds: number[],
  ): Promise<FilaHogarNbi[]> {
    return this.dataSource.query(
      `SELECT g.comunidad_id, COALESCE(hc.total, 0) as habitantes_activos, v.numero_dormitorios,
              tv.codigo as tipo_vivienda_codigo, mp.codigo as material_pared_codigo, mpi.codigo as material_piso_codigo,
              COALESCE(sv_agua.estado, 'no') as agua_estado, COALESCE(sv_san.estado, 'no') as saneamiento_estado
       FROM hogares g
       JOIN viviendas v ON v.id = g.vivienda_id
       LEFT JOIN catalogo_items tv ON tv.id = v.tipo_vivienda_catalogo_item_id
       LEFT JOIN catalogo_items mp ON mp.id = v.material_pared_catalogo_item_id
       LEFT JOIN catalogo_items mpi ON mpi.id = v.material_piso_catalogo_item_id
       LEFT JOIN (SELECT hogar_id, COUNT(*) as total FROM habitantes WHERE estado = 'activo' GROUP BY hogar_id) hc ON hc.hogar_id = g.id
       LEFT JOIN (
         SELECT vs.vivienda_id, vs.estado FROM vivienda_servicios vs
         JOIN catalogo_items ti ON ti.id = vs.tipo_servicio_catalogo_item_id WHERE ti.codigo = 'agua_potable'
       ) sv_agua ON sv_agua.vivienda_id = v.id
       LEFT JOIN (
         SELECT vs.vivienda_id, vs.estado FROM vivienda_servicios vs
         JOIN catalogo_items ti ON ti.id = vs.tipo_servicio_catalogo_item_id WHERE ti.codigo = 'saneamiento'
       ) sv_san ON sv_san.vivienda_id = v.id
       WHERE g.periodo_censal_id = $1 AND g.estado = 'activo' AND g.comunidad_id = ANY($2::int[])`,
      [periodoCensalId, comunidadIds],
    );
  }

  private calcularTasaNbiPorComunidad(
    filas: FilaHogarNbi[],
  ): Map<number, number> {
    const totalesPorComunidad = new Map<
      number,
      { totalHogares: number; conNbi: number }
    >();

    for (const fila of filas) {
      const resultado = calcularNbi({
        habitantesActivos: Number(fila.habitantes_activos),
        numeroDormitorios: fila.numero_dormitorios,
        tipoViviendaCodigo: fila.tipo_vivienda_codigo,
        materialParedCodigo: fila.material_pared_codigo,
        materialPisoCodigo: fila.material_piso_codigo,
        aguaPotableAdecuada: fila.agua_estado === EstadoServicio.SI,
        saneamientoAdecuado: fila.saneamiento_estado === EstadoServicio.SI,
      });

      const acumulado = totalesPorComunidad.get(fila.comunidad_id) ?? {
        totalHogares: 0,
        conNbi: 0,
      };
      acumulado.totalHogares += 1;
      if (resultado.tieneNbi) {
        acumulado.conNbi += 1;
      }
      totalesPorComunidad.set(fila.comunidad_id, acumulado);
    }

    const resultado = new Map<number, number>();
    for (const [comunidadId, { totalHogares, conNbi }] of totalesPorComunidad) {
      resultado.set(
        comunidadId,
        totalHogares > 0 ? this.redondear((conNbi / totalHogares) * 100) : 0,
      );
    }
    return resultado;
  }

  private async obtenerCoberturaEducativaPorComunidad(
    periodoCensalId: number,
    comunidadIds: number[],
  ): Promise<Map<number, { totalConDato: number; asisten: number }>> {
    const filas: {
      comunidad_id: number;
      total_con_dato: string;
      asisten: string;
    }[] = await this.dataSource.query(
      `SELECT h.comunidad_id, COUNT(*) as total_con_dato, COUNT(*) FILTER (WHERE he.asiste_escuela) as asisten
       FROM habitante_educaciones he
       JOIN habitantes h ON h.id = he.habitante_id
       WHERE h.periodo_censal_id = $1 AND h.estado = 'activo' AND h.comunidad_id = ANY($2::int[])
       GROUP BY h.comunidad_id`,
      [periodoCensalId, comunidadIds],
    );
    return new Map(
      filas.map((fila) => [
        fila.comunidad_id,
        {
          totalConDato: Number(fila.total_con_dato),
          asisten: Number(fila.asisten),
        },
      ]),
    );
  }

  private async obtenerVulnerabilidadPorComunidad(
    periodoCensalId: number,
    comunidadIds: number[],
  ): Promise<Map<number, number>> {
    const filas: { comunidad_id: number; con_condicion: string }[] =
      await this.dataSource.query(
        `SELECT h.comunidad_id, COUNT(DISTINCT hcv.habitante_id) as con_condicion
       FROM habitante_condiciones_vulnerabilidad hcv
       JOIN habitantes h ON h.id = hcv.habitante_id
       WHERE h.periodo_censal_id = $1 AND h.estado = 'activo' AND h.comunidad_id = ANY($2::int[])
       GROUP BY h.comunidad_id`,
        [periodoCensalId, comunidadIds],
      );
    return new Map(
      filas.map((fila) => [fila.comunidad_id, Number(fila.con_condicion)]),
    );
  }
}
