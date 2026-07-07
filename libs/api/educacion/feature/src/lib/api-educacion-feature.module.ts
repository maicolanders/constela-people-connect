import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitanteEducacion, HabitanteLengua } from '@censo/api-educacion-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { EducacionController } from './controllers/educacion.controller';
import { EducacionService } from './services/educacion.service';
import { IndicadoresEducativosService } from './services/indicadores-educativos.service';
import { EducacionSyncHandler } from './sync/educacion-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([HabitanteEducacion, HabitanteLengua]),
    ApiPoblacionFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [EducacionController],
  providers: [EducacionService, IndicadoresEducativosService, EducacionSyncHandler],
  exports: [EducacionService],
})
export class ApiEducacionFeatureModule {}
