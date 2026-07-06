import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RF-02-01: `edad_estimada` marca cuando `fecha_nacimiento` es sintética (1
 * de enero del año aproximado, ver HabitanteService) en vez de una fecha
 * exacta capturada. `identidad_genero_catalogo_item_id` referencia el nuevo
 * catálogo `identidad_genero` (dato sensible, ver CampoSensible en la
 * entidad), solo capturado si la comunidad lo tiene activado.
 */
export class AlterHabitantesAddCamposDemograficos1751700060000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE habitantes ADD COLUMN edad_estimada boolean NOT NULL DEFAULT false;
    `);
    await queryRunner.query(`
      ALTER TABLE habitantes ADD COLUMN identidad_genero_catalogo_item_id integer REFERENCES catalogo_items(id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE habitantes DROP COLUMN IF EXISTS identidad_genero_catalogo_item_id;`);
    await queryRunner.query(`ALTER TABLE habitantes DROP COLUMN IF EXISTS edad_estimada;`);
  }
}
