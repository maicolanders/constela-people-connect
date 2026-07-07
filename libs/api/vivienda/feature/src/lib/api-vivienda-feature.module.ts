import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vivienda, VivendaServicio } from '@censo/api-vivienda-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiCatalogoFeatureModule } from '@censo/api-catalogo-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { ViviendaController } from './controllers/vivienda.controller';
import { CoberturaServiciosService } from './services/cobertura-servicios.service';
import { HacinamientoNbiService } from './services/hacinamiento-nbi.service';
import { ViviendaService } from './services/vivienda.service';
import { ViviendaSyncHandler } from './sync/vivienda-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vivienda, VivendaServicio, Habitante]),
    ApiPoblacionFeatureModule,
    ApiCatalogoFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [ViviendaController],
  providers: [ViviendaService, HacinamientoNbiService, CoberturaServiciosService, ViviendaSyncHandler],
  exports: [ViviendaService],
})
export class ApiViviendaFeatureModule {}
