import { MigrationInterface, QueryRunner } from 'typeorm';

/** RF-02-01: la identidad de género es "configurable/activable según parametrización" por comunidad. */
export class AlterComunidadesAddCapturaIdentidadGenero1751700000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE comunidades ADD COLUMN captura_identidad_genero boolean NOT NULL DEFAULT false;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE comunidades DROP COLUMN IF EXISTS captura_identidad_genero;`);
  }
}
