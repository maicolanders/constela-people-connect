import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { EtniaVulnerabilidadController } from './controllers/etnia-vulnerabilidad.controller';
import { CaracterizacionEtnicaService } from './services/caracterizacion-etnica.service';
import { EtniaVulnerabilidadService } from './services/etnia-vulnerabilidad.service';
import { EtniaVulnerabilidadSyncHandler } from './sync/etnia-vulnerabilidad-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HabitanteEtnia,
      HabitanteCondicionVulnerabilidad,
    ]),
    ApiPoblacionFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [EtniaVulnerabilidadController],
  providers: [
    EtniaVulnerabilidadService,
    CaracterizacionEtnicaService,
    EtniaVulnerabilidadSyncHandler,
  ],
  exports: [EtniaVulnerabilidadService],
})
export class ApiEtniaVulnerabilidadFeatureModule {}
