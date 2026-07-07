import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateViviendasTable1751900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE viviendas (
        id serial PRIMARY KEY,
        comunidad_id integer NOT NULL REFERENCES comunidades(id),
        tipo_vivienda_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        material_pared_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        material_piso_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        material_techo_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        numero_habitaciones integer,
        numero_dormitorios integer NOT NULL CHECK (numero_dormitorios > 0),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_viviendas_comunidad ON viviendas (comunidad_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS viviendas;`);
  }
}
