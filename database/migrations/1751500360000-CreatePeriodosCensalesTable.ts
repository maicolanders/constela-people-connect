import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePeriodosCensalesTable1751500360000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE periodos_censales (
        id serial PRIMARY KEY,
        nombre varchar(150) NOT NULL,
        codigo varchar(30) NOT NULL UNIQUE,
        fecha_inicio date NOT NULL,
        fecha_cierre date,
        estado varchar(20) NOT NULL DEFAULT 'planeado' CHECK (estado IN ('planeado', 'abierto', 'cerrado')),
        periodo_origen_id integer REFERENCES periodos_censales(id),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS periodos_censales;`);
  }
}
