import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1751500300000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id serial PRIMARY KEY,
        usuario_id integer NOT NULL REFERENCES usuarios(id),
        token_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        revoked_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX refresh_tokens_usuario_id_idx ON refresh_tokens (usuario_id);`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens;`);
  }
}
