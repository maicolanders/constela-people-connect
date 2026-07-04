import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitantesTable1751600060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitantes (
        id serial PRIMARY KEY,
        uuid varchar(36) NOT NULL UNIQUE,
        hogar_id integer NOT NULL REFERENCES hogares(id),
        comunidad_id integer NOT NULL REFERENCES comunidades(id),
        periodo_censal_id integer NOT NULL REFERENCES periodos_censales(id),
        periodo_baja_id integer REFERENCES periodos_censales(id),
        estado varchar(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'fallecido', 'trasladado', 'no_localizado')),
        motivo_baja text,
        fecha_baja date,
        nombres varchar(150) NOT NULL,
        apellidos varchar(150) NOT NULL,
        tipo_documento_id integer REFERENCES catalogo_items(id),
        numero_documento varchar(50),
        identificador_interno varchar(36) UNIQUE,
        fecha_nacimiento date NOT NULL,
        sexo varchar(1) NOT NULL CHECK (sexo IN ('M', 'F')),
        consentimiento_informado boolean NOT NULL DEFAULT false,
        consentimiento_fecha timestamptz,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    // RF-01-01: unicidad de documento dentro de la misma comunidad (excluye
    // habitantes sin documento oficial, identificados por identificador_interno).
    await queryRunner.query(`
      CREATE UNIQUE INDEX habitantes_documento_comunidad_key
        ON habitantes (comunidad_id, tipo_documento_id, numero_documento)
        WHERE numero_documento IS NOT NULL;
    `);

    // jefe_hogar_id vive en hogares pero depende de que habitantes ya exista.
    await queryRunner.query(`
      ALTER TABLE hogares ADD COLUMN jefe_hogar_id integer REFERENCES habitantes(id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hogares DROP COLUMN IF EXISTS jefe_hogar_id;`);
    await queryRunner.query(`DROP TABLE IF EXISTS habitantes;`);
  }
}
