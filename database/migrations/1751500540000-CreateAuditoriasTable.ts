import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditoriasTable1751500540000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE auditorias (
        id serial PRIMARY KEY,
        tabla varchar(100) NOT NULL,
        registro_id integer NOT NULL,
        campo varchar(100),
        valor_anterior text,
        valor_nuevo text,
        accion varchar(20) NOT NULL CHECK (accion IN ('crear', 'actualizar', 'eliminar')),
        usuario_id integer REFERENCES usuarios(id),
        fecha_hora timestamptz NOT NULL
      );
    `);
    await queryRunner.query(`CREATE INDEX auditorias_tabla_registro_id_idx ON auditorias (tabla, registro_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS auditorias;`);
  }
}
