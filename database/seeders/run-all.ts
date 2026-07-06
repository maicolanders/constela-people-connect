import { AppDataSource } from '../data-source';
import { seedCatalogosBase } from './seed-catalogos-base';
import { seedRoles } from './seed-roles';
import { seedUbicacionesGeograficasEjemplo } from './seed-ubicaciones-geograficas-ejemplo';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await seedRoles(AppDataSource);
    await seedCatalogosBase(AppDataSource);
    await seedUbicacionesGeograficasEjemplo(AppDataSource);
    // eslint-disable-next-line no-console
    console.log('Seed completado: roles, catálogos base y jerarquía geográfica de ejemplo.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Seed falló:', error);
  process.exitCode = 1;
});
