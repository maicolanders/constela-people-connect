import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fase 14 (autogestión): refresh tokens de la sesión del propio habitante,
 * mismo patrón de rotación con bcrypt que `refresh_tokens` (Usuario/staff,
 * Fase 0) pero en tabla separada — un habitante no es un `Usuario`.
 */
export class CreateHabitanteRefreshTokensTable1752100060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_refresh_tokens (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        token_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX habitante_refresh_tokens_habitante_id_idx ON habitante_refresh_tokens (habitante_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_refresh_tokens;`);
  }
}
