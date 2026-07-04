import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateComunidadesTable1751500060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE comunidades (
        id serial PRIMARY KEY,
        nombre varchar(150) NOT NULL,
        codigo varchar(30) NOT NULL UNIQUE,
        descripcion text,
        activa boolean NOT NULL DEFAULT true,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS comunidades;`);
  }
}
