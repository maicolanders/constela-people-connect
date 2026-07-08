import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMovimientosMigratoriosTable1751900360000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE movimientos_migratorios (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        periodo_censal_id integer NOT NULL REFERENCES periodos_censales(id),
        tipo_movimiento varchar(10) NOT NULL CHECK (tipo_movimiento IN ('interna', 'externa')),
        direccion varchar(10) NOT NULL CHECK (direccion IN ('entrada', 'salida')),
        origen_ubicacion_geografica_id integer REFERENCES ubicaciones_geograficas(id),
        origen_descripcion_libre varchar(150),
        destino_ubicacion_geografica_id integer REFERENCES ubicaciones_geograficas(id),
        destino_descripcion_libre varchar(150),
        fecha_movimiento date NOT NULL,
        motivo_catalogo_item_id integer NOT NULL REFERENCES catalogo_items(id),
        es_temporal boolean NOT NULL,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(`CREATE INDEX idx_movimientos_migratorios_habitante ON movimientos_migratorios (habitante_id);`);
    await queryRunner.query(
      `CREATE INDEX idx_movimientos_migratorios_periodo ON movimientos_migratorios (periodo_censal_id);`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS movimientos_migratorios;`);
  }
}
