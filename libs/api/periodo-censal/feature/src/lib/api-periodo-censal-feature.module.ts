import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria, PERIODO_ESTADO_PROVIDER } from '@censo/api-shared-data-access';
import { PeriodoCensal } from '@censo/api-periodo-censal-data-access';
import { PeriodoCensalController } from './controllers/periodo-censal.controller';
import { PeriodoCensalService } from './services/periodo-censal.service';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodoCensal, Auditoria])],
  controllers: [PeriodoCensalController],
  providers: [PeriodoCensalService, { provide: PERIODO_ESTADO_PROVIDER, useExisting: PeriodoCensalService }],
  exports: [PeriodoCensalService, PERIODO_ESTADO_PROVIDER],
})
export class ApiPeriodoCensalFeatureModule {}
