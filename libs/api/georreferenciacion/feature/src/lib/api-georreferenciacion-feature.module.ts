import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HogarUbicacion, UbicacionGeografica } from '@censo/api-georreferenciacion-data-access';
import { ApiAuthFeatureModule } from '@censo/api-auth-feature';
import { UbicacionGeograficaController } from './controllers/ubicacion-geografica.controller';
import { HogarUbicacionService } from './services/hogar-ubicacion.service';
import { UbicacionGeograficaService } from './services/ubicacion-geografica.service';

@Module({
  imports: [TypeOrmModule.forFeature([UbicacionGeografica, HogarUbicacion]), ApiAuthFeatureModule],
  controllers: [UbicacionGeograficaController],
  providers: [UbicacionGeograficaService, HogarUbicacionService],
  exports: [UbicacionGeograficaService, HogarUbicacionService],
})
export class ApiGeorreferenciacionFeatureModule {}
