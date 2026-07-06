import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-02-03: primera vista materializada del proyecto. Los indicadores
 * demográficos son un artefacto de cierre de periodo ("se recalculan al
 * cerrar un periodo censal"), por eso solo agrega periodos `cerrado` y usa
 * `fecha_cierre` (no la fecha actual) como referencia para calcular edades —
 * queda congelada, no se recalcula sola con el paso del tiempo.
 *
 * `altas_periodo`: todo habitante con `periodo_censal_id` = ese periodo, sin
 * filtrar por motivo (RF-02-03 pide la tasa "a partir de altas/bajas" tal
 * cual, de ahí "aparente"). `defunciones_periodo`: se filtra por
 * `estado = 'fallecido'` sobre `periodo_baja_id` — un traslado o "no
 * localizado" no es una defunción, contarlo sería incorrecto.
 *
 * Se refresca explícitamente desde IndicadoresDemograficosService al cerrar
 * un periodo (ver PeriodoCierreHookRegistry), no hay REFRESH automático de
 * Postgres.
 */
export class CreateMvIndicadoresDemograficosPeriodo1751700120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW mv_indicadores_demograficos_periodo AS
      WITH poblacion_activa AS (
        SELECT
          h.comunidad_id,
          h.periodo_censal_id,
          COUNT(*) AS poblacion_total,
          COUNT(*) FILTER (
            WHERE DATE_PART('year', AGE(pc.fecha_cierre, h.fecha_nacimiento)) BETWEEN 0 AND 14
          ) AS poblacion_0_14,
          COUNT(*) FILTER (
            WHERE DATE_PART('year', AGE(pc.fecha_cierre, h.fecha_nacimiento)) BETWEEN 15 AND 64
          ) AS poblacion_15_64,
          COUNT(*) FILTER (
            WHERE DATE_PART('year', AGE(pc.fecha_cierre, h.fecha_nacimiento)) >= 65
          ) AS poblacion_65_mas
        FROM habitantes h
        JOIN periodos_censales pc ON pc.id = h.periodo_censal_id
        WHERE h.deleted_at IS NULL AND h.estado = 'activo' AND pc.estado = 'cerrado'
        GROUP BY h.comunidad_id, h.periodo_censal_id
      ),
      altas AS (
        SELECT comunidad_id, periodo_censal_id, COUNT(*) AS altas_periodo
        FROM habitantes
        WHERE deleted_at IS NULL
        GROUP BY comunidad_id, periodo_censal_id
      ),
      defunciones AS (
        SELECT comunidad_id, periodo_baja_id AS periodo_censal_id, COUNT(*) AS defunciones_periodo
        FROM habitantes
        WHERE deleted_at IS NULL AND estado = 'fallecido' AND periodo_baja_id IS NOT NULL
        GROUP BY comunidad_id, periodo_baja_id
      )
      SELECT
        pa.comunidad_id,
        pa.periodo_censal_id,
        pa.poblacion_total,
        pa.poblacion_0_14,
        pa.poblacion_15_64,
        pa.poblacion_65_mas,
        COALESCE(al.altas_periodo, 0) AS altas_periodo,
        COALESCE(d.defunciones_periodo, 0) AS defunciones_periodo
      FROM poblacion_activa pa
      LEFT JOIN altas al ON al.comunidad_id = pa.comunidad_id AND al.periodo_censal_id = pa.periodo_censal_id
      LEFT JOIN defunciones d ON d.comunidad_id = pa.comunidad_id AND d.periodo_censal_id = pa.periodo_censal_id;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX mv_indicadores_demograficos_periodo_key
        ON mv_indicadores_demograficos_periodo (comunidad_id, periodo_censal_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS mv_indicadores_demograficos_periodo;`);
  }
}
