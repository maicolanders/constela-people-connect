import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteEtniasAndCondicionesVulnerabilidadTables1751900420000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_etnias (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL UNIQUE REFERENCES habitantes(id),
        etnia_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        lengua_materna_catalogo_item_id integer REFERENCES catalogo_items(id),
        resguardo_ubicacion_geografica_id integer REFERENCES ubicaciones_geograficas(id),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`
      CREATE TABLE habitante_condiciones_vulnerabilidad (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        condicion_vulnerabilidad_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz,
        UNIQUE (habitante_id, condicion_vulnerabilidad_catalogo_item_id)
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_habitante_condiciones_vulnerabilidad_habitante ON habitante_condiciones_vulnerabilidad (habitante_id);`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS habitante_condiciones_vulnerabilidad;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_etnias;`);
  }
}
