import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteOcupacionesTable1751900300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_ocupaciones (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL UNIQUE REFERENCES habitantes(id),
        condicion_actividad_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        ocupacion_catalogo_item_id integer REFERENCES catalogo_items(id),
        ingreso_mensual numeric(12,2),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_ocupaciones;`);
  }
}
