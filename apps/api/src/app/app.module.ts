import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiAuthFeatureModule, JwtAuthGuard } from '@censo/api-auth-feature';
import { ApiCatalogoFeatureModule } from '@censo/api-catalogo-feature';
import { ApiComunidadFeatureModule } from '@censo/api-comunidad-feature';
import { ApiPeriodoCensalFeatureModule } from '@censo/api-periodo-censal-feature';
import { ApiPoblacionFeatureModule } from '@censo/api-poblacion-feature';
import { ApiDemografiaFeatureModule } from '@censo/api-demografia-feature';
import { ApiSharedFeatureModule, GlobalExceptionFilter } from '@censo/api-shared-feature';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'censo'),
        password: config.get<string>('DB_PASSWORD', 'censo'),
        database: config.get<string>('DB_NAME', 'censo_indigena'),
        // El esquema solo cambia vía database/migrations; nunca sincronizar en runtime.
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    ApiSharedFeatureModule,
    ApiAuthFeatureModule,
    ApiComunidadFeatureModule,
    ApiPeriodoCensalFeatureModule,
    ApiCatalogoFeatureModule,
    ApiPoblacionFeatureModule,
    ApiDemografiaFeatureModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Autenticación JWT global; usar @Public() para las rutas que deban quedar abiertas.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
