import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comunidad } from '@censo/api-comunidad-data-access';
import { ComunidadController } from './controllers/comunidad.controller';
import { ComunidadService } from './services/comunidad.service';

@Module({
  imports: [TypeOrmModule.forFeature([Comunidad])],
  controllers: [ComunidadController],
  providers: [ComunidadService],
  exports: [ComunidadService],
})
export class ApiComunidadFeatureModule {}
