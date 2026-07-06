import { ValueTransformer, ViewColumn, ViewEntity } from 'typeorm';

/** Postgres devuelve bigint (COUNT) como string en el driver pg; se convierte a number (seguro para conteos poblacionales). */
const transformadorConteo: ValueTransformer = {
  to: (valor: number) => valor,
  from: (valor: string) => parseInt(valor, 10),
};

/**
 * Mapea `mv_indicadores_demograficos_periodo` (ver migración
 * CreateMvIndicadoresDemograficosPeriodo). Vista de solo lectura: el schema
 * lo gestiona la migración raw SQL, nunca `synchronize`.
 */
@ViewEntity({ name: 'mv_indicadores_demograficos_periodo', synchronize: false })
export class IndicadorDemograficoPeriodo {
  @ViewColumn({ name: 'comunidad_id' })
  comunidadId!: number;

  @ViewColumn({ name: 'periodo_censal_id' })
  periodoCensalId!: number;

  @ViewColumn({ name: 'poblacion_total', transformer: transformadorConteo })
  poblacionTotal!: number;

  @ViewColumn({ name: 'poblacion_0_14', transformer: transformadorConteo })
  poblacion0a14!: number;

  @ViewColumn({ name: 'poblacion_15_64', transformer: transformadorConteo })
  poblacion15a64!: number;

  @ViewColumn({ name: 'poblacion_65_mas', transformer: transformadorConteo })
  poblacion65Mas!: number;

  @ViewColumn({ name: 'altas_periodo', transformer: transformadorConteo })
  altasPeriodo!: number;

  @ViewColumn({ name: 'defunciones_periodo', transformer: transformadorConteo })
  defuncionesPeriodo!: number;
}
