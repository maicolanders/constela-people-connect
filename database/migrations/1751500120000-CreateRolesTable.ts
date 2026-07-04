import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesTable1751500120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id serial PRIMARY KEY,
        codigo varchar(30) NOT NULL UNIQUE,
        nombre varchar(100) NOT NULL
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS roles;`);
  }
}
