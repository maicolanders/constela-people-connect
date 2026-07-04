import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogoItem, CatalogoTipo } from '@censo/api-catalogo-data-access';
import { CatalogoController } from './controllers/catalogo.controller';
import { CatalogoService } from './services/catalogo.service';

@Module({
  imports: [TypeOrmModule.forFeature([CatalogoTipo, CatalogoItem])],
  controllers: [CatalogoController],
  providers: [CatalogoService],
  exports: [CatalogoService],
})
export class ApiCatalogoFeatureModule {}
