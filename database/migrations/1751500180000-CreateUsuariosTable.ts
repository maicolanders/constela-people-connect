import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuariosTable1751500180000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuarios (
        id serial PRIMARY KEY,
        nombre varchar(100) NOT NULL,
        apellido varchar(100) NOT NULL,
        email varchar(255) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        activo boolean NOT NULL DEFAULT true,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios;`);
  }
}
