import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificacionesTable1751900540000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notificaciones (
        id serial PRIMARY KEY,
        comunidad_id integer REFERENCES comunidades(id),
        rol_destino varchar(30),
        usuario_destino_id integer REFERENCES usuarios(id),
        tipo varchar(50) NOT NULL,
        mensaje text NOT NULL,
        fecha_programada date NOT NULL,
        notificado_en timestamptz,
        leida_en timestamptz,
        created_by integer,
        updated_by integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
    `);

    await queryRunner.query(
      `CREATE INDEX idx_notificaciones_fecha_programada ON notificaciones (fecha_programada) WHERE notificado_en IS NULL;`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notificaciones;`);
  }
}
