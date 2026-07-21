import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 14 (autogestión): credencial de autoservicio del propio habitante
 * (password_hash/credencial_activa) y datos de contacto que el habitante
 * puede editar por sí mismo (telefono/correo_electronico) — a diferencia de
 * los demás campos de `habitantes`, capturados/editados solo por el censista.
 */
export class AlterHabitantesAddCredencialesYContacto1752100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE habitantes
        ADD COLUMN password_hash varchar(255),
        ADD COLUMN credencial_activa boolean NOT NULL DEFAULT false,
        ADD COLUMN telefono varchar(30),
        ADD COLUMN correo_electronico varchar(255);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE habitantes
        DROP COLUMN correo_electronico,
        DROP COLUMN telefono,
        DROP COLUMN credencial_activa,
        DROP COLUMN password_hash;
    `);
  }
}
