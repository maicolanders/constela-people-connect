import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogoItemsTable1751500480000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE catalogo_items (
        id serial PRIMARY KEY,
        catalogo_tipo_id integer NOT NULL REFERENCES catalogo_tipos(id),
        codigo varchar(60) NOT NULL,
        nombre varchar(150) NOT NULL,
        padre_id integer REFERENCES catalogo_items(id),
        orden integer NOT NULL DEFAULT 0,
        activo boolean NOT NULL DEFAULT true,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (catalogo_tipo_id, codigo)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS catalogo_items;`);
  }
}
