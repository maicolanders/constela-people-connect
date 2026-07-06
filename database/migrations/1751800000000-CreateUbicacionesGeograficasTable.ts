import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUbicacionesGeograficasTable1751800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE ubicaciones_geograficas (
        id serial PRIMARY KEY,
        nivel_geografico_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        padre_id integer REFERENCES ubicaciones_geograficas(id),
        nombre varchar(150) NOT NULL,
        codigo varchar(30),
        activo boolean NOT NULL DEFAULT true,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_ubicaciones_geograficas_padre ON ubicaciones_geograficas (padre_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS ubicaciones_geograficas;`);
  }
}
