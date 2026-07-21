import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RNF-05 (escalabilidad): a medida que crece el volumen de habitantes por
 * comunidad, `comunidad_id` no tenía ningún índice propio (solo aparecía
 * dentro del índice único parcial de documento) — toda consulta "habitantes
 * de mi comunidad" (listado paginado, pull de duplicados, conteo) hacía un
 * seq scan completo de la tabla. Se agregan dos índices:
 *  - (comunidad_id, estado): patrón de consulta dominante hoy.
 *  - (comunidad_id, numero_documento) con varchar_pattern_ops: soporta tanto
 *    igualdad como `LIKE 'prefijo%'` (buscador por número de documento) sin
 *    depender del collation por defecto de la base de datos.
 */
export class AddHabitantesIndicesBusquedaPaginacion1752000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX habitantes_comunidad_estado_idx
        ON habitantes (comunidad_id, estado);
    `);

    await queryRunner.query(`
      CREATE INDEX habitantes_comunidad_documento_idx
        ON habitantes (comunidad_id, numero_documento varchar_pattern_ops)
        WHERE numero_documento IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS habitantes_comunidad_documento_idx;`);
    await queryRunner.query(`DROP INDEX IF EXISTS habitantes_comunidad_estado_idx;`);
  }
}
