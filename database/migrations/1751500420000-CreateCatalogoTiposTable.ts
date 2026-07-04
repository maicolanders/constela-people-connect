import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogoTiposTable1751500420000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE catalogo_tipos (
        id serial PRIMARY KEY,
        codigo varchar(60) NOT NULL UNIQUE,
        nombre varchar(150) NOT NULL,
        jerarquico boolean NOT NULL DEFAULT false
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS catalogo_tipos;`);
  }
}
