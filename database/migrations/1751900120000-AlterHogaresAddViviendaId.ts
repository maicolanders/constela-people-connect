import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterHogaresAddViviendaId1751900120000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hogares ADD COLUMN vivienda_id integer REFERENCES viviendas(id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE hogares DROP COLUMN IF EXISTS vivienda_id;`);
  }
}
