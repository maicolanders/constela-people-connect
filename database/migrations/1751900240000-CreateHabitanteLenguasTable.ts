import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteLenguasTable1751900240000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_lenguas (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        lengua_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        es_lengua_materna boolean NOT NULL DEFAULT false,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (habitante_id, lengua_catalogo_item_id)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_lenguas;`);
  }
}
