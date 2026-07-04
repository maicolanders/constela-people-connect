import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHabitanteRevisionesDuplicadoTable1751600180000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE habitante_revisiones_duplicado (
        id serial PRIMARY KEY,
        habitante_id integer NOT NULL REFERENCES habitantes(id),
        habitante_similar_id integer NOT NULL REFERENCES habitantes(id),
        score_similitud numeric(4,3) NOT NULL,
        decision varchar(30) NOT NULL DEFAULT 'confirmado_no_duplicado',
        justificacion text,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS habitante_revisiones_duplicado;`);
  }
}
