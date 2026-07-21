import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Habitante,
  HabitanteParentesco,
  HabitanteRefreshToken,
  HabitanteRevisionDuplicado,
  Hogar,
} from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { ApiAuthFeatureModule, segundosDesdeExpresion } from '@censo/api-auth-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiSharedFeatureModule } from '@censo/api-shared-feature';
import { ApiGeorreferenciacionFeatureModule } from '@censo/api-georreferenciacion-feature';
import { HabitanteAuthService } from './auth/habitante-auth.service';
import { HabitanteJwtAuthGuard } from './auth/habitante-jwt-auth.guard';
import { HabitanteJwtStrategy } from './auth/habitante-jwt.strategy';
import { HabitanteAutogestionController } from './controllers/habitante-autogestion.controller';
import { HabitanteController } from './controllers/habitante.controller';
import { HogarController } from './controllers/hogar.controller';
import { HabitanteService } from './services/habitante.service';
import { HogarService } from './services/hogar.service';
import { MapaHogaresService } from './services/mapa-hogares.service';
import { HabitantesSyncHandler } from './sync/habitantes-sync.handler';
import { HogaresSyncHandler } from './sync/hogares-sync.handler';
import { HogarUbicacionesSyncHandler } from './sync/hogar-ubicaciones-sync.handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Hogar,
      Habitante,
      HabitanteParentesco,
      HabitanteRevisionDuplicado,
      HabitanteRefreshToken,
      CatalogoItem,
    ]),
    ApiAuthFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiSharedFeatureModule,
    ApiGeorreferenciacionFeatureModule,
    PassportModule,
    // Registro independiente del JwtModule de ApiAuthFeatureModule: secreto
    // propio (JWT_HABITANTE_ACCESS_SECRET) distinto de JWT_ACCESS_SECRET, para
    // que un token de un actor nunca sea válido para el otro.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_HABITANTE_ACCESS_SECRET', 'change-me-habitante-access-secret'),
        signOptions: {
          expiresIn: segundosDesdeExpresion(configService.get<string>('JWT_HABITANTE_ACCESS_EXPIRES_IN', '15m')),
        },
      }),
    }),
  ],
  // HabitanteAutogestionController PRIMERO: sus rutas literales (auth/registro,
  // mi-perfil, mi-contacto, mi-hogar/nucleo-familiar) deben registrarse antes
  // que la ruta ':id' de HabitanteController (mismo bug de orden de rutas ya
  // documentado en Fase 10).
  controllers: [HabitanteAutogestionController, HogarController, HabitanteController],
  providers: [
    HogarService,
    HabitanteService,
    MapaHogaresService,
    HogaresSyncHandler,
    HabitantesSyncHandler,
    HogarUbicacionesSyncHandler,
    HabitanteAuthService,
    HabitanteJwtStrategy,
    HabitanteJwtAuthGuard,
  ],
  exports: [HogarService, HabitanteService, HabitanteJwtAuthGuard],
})
export class ApiPoblacionFeatureModule {}
