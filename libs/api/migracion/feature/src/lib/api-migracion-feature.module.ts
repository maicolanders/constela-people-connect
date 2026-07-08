import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoMigratorio } from '@censo/api-migracion-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiGeorreferenciacionFeatureModule } from '@censo/api-georreferenciacion-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { MigracionController } from './controllers/migracion.controller';
import { FlujosMigratoriosService } from './services/flujos-migratorios.service';
import { MigracionService } from './services/migracion.service';
import { MigracionSyncHandler } from './sync/migracion-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovimientoMigratorio]),
    ApiPoblacionFeatureModule,
    ApiGeorreferenciacionFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [MigracionController],
  providers: [MigracionService, FlujosMigratoriosService, MigracionSyncHandler],
  exports: [MigracionService],
})
export class ApiMigracionFeatureModule {}
