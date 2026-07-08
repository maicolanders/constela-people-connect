import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Presupuesto } from '@censo/api-recursos-data-access';
import { ApiComunidadFeatureModule } from '@censo/api-comunidad-feature';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { RecursosController } from './controllers/recursos.controller';
import { IndicadoresRecursosService } from './services/indicadores-recursos.service';
import { PresupuestoService } from './services/presupuesto.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Presupuesto]),
    ApiComunidadFeatureModule,
    ApiAuthFeatureModule,
    ApiSharedFeatureModule,
  ],
  controllers: [RecursosController],
  providers: [PresupuestoService, IndicadoresRecursosService],
  exports: [PresupuestoService],
})
export class ApiRecursosFeatureModule {}
