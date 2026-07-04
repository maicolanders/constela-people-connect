import { DataSource } from 'typeorm';
import { RolCodigo } from '../../libs/shared/data-access/src/lib/rol-codigo.enum';

const ROLES: Array<{ codigo: RolCodigo; nombre: string }> = [
  { codigo: RolCodigo.CENSISTA, nombre: 'Censista de campo' },
  { codigo: RolCodigo.LIDER_COMUNITARIO, nombre: 'Líder comunitario / autoridad indígena' },
  { codigo: RolCodigo.ANALISTA, nombre: 'Analista / entidad gubernamental' },
  { codigo: RolCodigo.ADMINISTRADOR, nombre: 'Administrador del sistema' },
];

export async function seedRoles(dataSource: DataSource): Promise<void> {
  for (const rol of ROLES) {
    await dataSource.query(
      `INSERT INTO roles (codigo, nombre) VALUES ($1, $2) ON CONFLICT (codigo) DO NOTHING;`,
      [rol.codigo, rol.nombre],
    );
  }
}
