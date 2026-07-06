import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Habitante } from '@censo/api-poblacion-data-access';
import { IndicadorDemograficoPeriodo } from '@censo/api-demografia-data-access';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { DemografiaController } from './controllers/demografia.controller';
import { IndicadoresDemograficosService } from './services/indicadores-demograficos.service';
import { PiramidePoblacionalService } from './services/piramide-poblacional.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Habitante, IndicadorDemograficoPeriodo]),
    ApiAuthFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [DemografiaController],
  providers: [PiramidePoblacionalService, IndicadoresDemograficosService],
})
export class ApiDemografiaFeatureModule {}
