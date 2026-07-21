import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { EtniaVulnerabilidadController } from './controllers/etnia-vulnerabilidad.controller';
import { CaracterizacionEtnicaService } from './services/caracterizacion-etnica.service';
import { ConstanciaAfiliacionService } from './services/constancia-afiliacion.service';
import { EtniaVulnerabilidadService } from './services/etnia-vulnerabilidad.service';
import { EtniaVulnerabilidadSyncHandler } from './sync/etnia-vulnerabilidad-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      HabitanteEtnia,
      HabitanteCondicionVulnerabilidad,
      CatalogoItem,
    ]),
    ApiPoblacionFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [EtniaVulnerabilidadController],
  providers: [
    EtniaVulnerabilidadService,
    CaracterizacionEtnicaService,
    ConstanciaAfiliacionService,
    EtniaVulnerabilidadSyncHandler,
  ],
  exports: [EtniaVulnerabilidadService],
})
export class ApiEtniaVulnerabilidadFeatureModule {}
