import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateViviendaServiciosTable1751900060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE vivienda_servicios (
        id serial PRIMARY KEY,
        vivienda_id integer NOT NULL REFERENCES viviendas(id),
        tipo_servicio_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        estado varchar(10) NOT NULL CHECK (estado IN ('si', 'no', 'parcial')),
        fuente_catalogo_item_id integer REFERENCES catalogo_items(id),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (vivienda_id, tipo_servicio_catalogo_item_id)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vivienda_servicios;`);
  }
}
