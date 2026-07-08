import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria, PERIODO_ESTADO_PROVIDER } from '@censo/api-shared-data-access';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { Notificacion, PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { NotificacionesController } from './controllers/notificaciones.controller';
import { PeriodoCensalController } from './controllers/periodo-censal.controller';
import { ComparacionHistoricaService } from './services/comparacion-historica.service';
import { NotificacionesService } from './services/notificaciones.service';
import { PeriodoCensalService } from './services/periodo-censal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PeriodoCensal, Notificacion, Auditoria]),
    ApiSharedFeatureModule,
    ApiAuthFeatureModule,
  ],
  controllers: [PeriodoCensalController, NotificacionesController],
  providers: [
    PeriodoCensalService,
    ComparacionHistoricaService,
    NotificacionesService,
    { provide: PERIODO_ESTADO_PROVIDER, useExisting: PeriodoCensalService },
  ],
  exports: [PeriodoCensalService, PERIODO_ESTADO_PROVIDER],
})
export class ApiPeriodoCensalFeatureModule {}
