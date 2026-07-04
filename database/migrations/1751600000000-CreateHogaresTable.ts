import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `jefe_hogar_id` se agrega en la migración de `habitantes` (dependencia
 * circular entre hogares <-> habitantes): esta tabla se crea primero sin esa
 * columna, y la siguiente migración la añade una vez que `habitantes` existe.
 */
export class CreateHogaresTable1751600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hogares (
        id serial PRIMARY KEY,
        uuid varchar(36) NOT NULL UNIQUE,
        comunidad_id integer NOT NULL REFERENCES comunidades(id),
        periodo_censal_id integer NOT NULL REFERENCES periodos_censales(id),
        periodo_baja_id integer REFERENCES periodos_censales(id),
        estado varchar(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
        motivo_baja varchar(200),
        direccion_referencia text,
        consentimiento_informado boolean NOT NULL DEFAULT false,
        consentimiento_fecha timestamptz,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hogares;`);
  }
}
