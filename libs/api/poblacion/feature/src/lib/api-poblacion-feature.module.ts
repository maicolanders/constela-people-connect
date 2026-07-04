import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Habitante,
  HabitanteParentesco,
  HabitanteRevisionDuplicado,
  Hogar,
} from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { HabitanteController } from './controllers/habitante.controller';
import { HogarController } from './controllers/hogar.controller';
import { HabitanteService } from './services/habitante.service';
import { HogarService } from './services/hogar.service';
import { HabitantesSyncHandler } from './sync/habitantes-sync.handler';
import { HogaresSyncHandler } from './sync/hogares-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Hogar, Habitante, HabitanteParentesco, HabitanteRevisionDuplicado, CatalogoItem]),
    ApiAuthFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [HogarController, HabitanteController],
  providers: [HogarService, HabitanteService, HogaresSyncHandler, HabitantesSyncHandler],
  exports: [HogarService, HabitanteService],
})
export class ApiPoblacionFeatureModule {}
