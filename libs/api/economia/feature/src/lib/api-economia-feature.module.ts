import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HabitanteOcupacion } from '@censo/api-economia-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { EconomiaController } from './controllers/economia.controller';
import { EconomiaService } from './services/economia.service';
import { IndicadoresEconomicosService } from './services/indicadores-economicos.service';
import { EconomiaSyncHandler } from './sync/economia-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([HabitanteOcupacion]),
    ApiPoblacionFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [EconomiaController],
  providers: [EconomiaService, IndicadoresEconomicosService, EconomiaSyncHandler],
  exports: [EconomiaService],
})
export class ApiEconomiaFeatureModule {}
