import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteEducacionesTable1751900180000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_educaciones (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL UNIQUE REFERENCES habitantes(id),
        alfabetizado boolean NOT NULL,
        nivel_educativo_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        asiste_escuela boolean NOT NULL,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_educaciones;`);
  }
}
