import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken, Rol, Usuario, UsuarioRol } from '@censo/api-auth-data-access';
import { AuthController } from './controllers/auth.controller';
import { ComunidadScopeGuard } from './guards/comunidad-scope.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { segundosDesdeExpresion } from './util/duracion.util';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    TypeOrmModule.forFeature([Usuario, Rol, UsuarioRol, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET', 'change-me-access-secret'),
        signOptions: { expiresIn: segundosDesdeExpresion(configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, ComunidadScopeGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard, ComunidadScopeGuard],
})
export class ApiAuthFeatureModule {}
