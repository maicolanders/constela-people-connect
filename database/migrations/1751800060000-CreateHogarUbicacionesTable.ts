import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHogarUbicacionesTable1751800060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE hogar_ubicaciones (
        id serial PRIMARY KEY,
        hogar_id integer NOT NULL UNIQUE REFERENCES hogares(id),
        comunidad_id integer NOT NULL REFERENCES comunidades(id),
        ubicacion_geografica_id integer NOT NULL REFERENCES ubicaciones_geograficas(id),
        coordenadas geometry(Point,4326) NOT NULL,
        precision_metros numeric(10,2),
        capturado_en timestamptz NOT NULL,
        clasificacion varchar(20) NOT NULL CHECK (clasificacion IN ('rural', 'urbana')),
        tipo_territorio_catalogo_item_id integer REFERENCES catalogo_items(id),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_hogar_ubicaciones_comunidad ON hogar_ubicaciones (comunidad_id);`);
    await queryRunner.query(
      `CREATE INDEX idx_hogar_ubicaciones_coordenadas ON hogar_ubicaciones USING GIST (coordenadas);`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS hogar_ubicaciones;`);
  }
}
