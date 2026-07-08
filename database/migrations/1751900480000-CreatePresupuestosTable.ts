import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePresupuestosTable1751900480000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE presupuestos (
        id serial PRIMARY KEY,
        comunidad_id integer NOT NULL REFERENCES comunidades(id),
        periodo_censal_id integer NOT NULL REFERENCES periodos_censales(id),
        monto numeric(14,2) NOT NULL CHECK (monto > 0),
        observaciones text,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (comunidad_id, periodo_censal_id)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS presupuestos;`);
  }
}
