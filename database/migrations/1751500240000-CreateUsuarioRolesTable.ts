import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsuarioRolesTable1751500240000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuario_roles (
        id serial PRIMARY KEY,
        usuario_id integer NOT NULL REFERENCES usuarios(id),
        rol_id integer NOT NULL REFERENCES roles(id),
        comunidad_id integer REFERENCES comunidades(id),
        UNIQUE (usuario_id, rol_id, comunidad_id)
      );
    `);
    // Postgres no considera duplicados dos NULL en una UNIQUE normal:
    // este índice parcial cubre el caso de asignación global (comunidad_id NULL).
    await queryRunner.query(`
      CREATE UNIQUE INDEX usuario_roles_usuario_rol_global_key
        ON usuario_roles (usuario_id, rol_id)
        WHERE comunidad_id IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS usuario_roles;`);
  }
}
