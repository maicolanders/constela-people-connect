import { AppDataSource } from '../data-source';
import { seedCatalogosBase } from './seed-catalogos-base';
import { seedRoles } from './seed-roles';

async function main(): Promise<void> {
  await AppDataSource.initialize();
  try {
    await seedRoles(AppDataSource);
    await seedCatalogosBase(AppDataSource);
    // eslint-disable-next-line no-console
    console.log('Seed completado: roles y catálogos base.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Seed falló:', error);
  process.exitCode = 1;
});
