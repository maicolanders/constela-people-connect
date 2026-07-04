import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteParentescosTable1751600120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_parentescos (
        id serial PRIMARY KEY,
        uuid varchar(36) NOT NULL UNIQUE,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        hogar_id integer NOT NULL REFERENCES hogares(id),
        catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        periodo_censal_id integer NOT NULL REFERENCES periodos_censales(id),
        version integer NOT NULL DEFAULT 1,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (habitante_id, periodo_censal_id)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_parentescos;`);
  }
}
