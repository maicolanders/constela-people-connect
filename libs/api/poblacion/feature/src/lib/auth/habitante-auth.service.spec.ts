import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Habitante, HabitanteRefreshToken } from '@censo/api-poblacion-data-access';
import { EstadoHabitante, SexoHabitante } from '@censo/shared-data-access';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { HabitanteAuthService } from './habitante-auth.service';

function crearRepositorioFalso<T extends object>(): jest.Mocked<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((valor) => valor),
    create: jest.fn((valor) => valor),
  } as unknown as jest.Mocked<Repository<T>>;
}

function crearHabitante(overrides: Partial<Habitante> = {}): Habitante {
  return {
    id: 1,
    hogarId: 10,
    comunidadId: 100,
    tipoDocumentoId: 1,
    numeroDocumento: '123456',
    fechaNacimiento: '2000-01-15',
    sexo: SexoHabitante.MASCULINO,
    estado: EstadoHabitante.ACTIVO,
    nombres: 'Ana',
    apellidos: 'Tunubala',
    credencialActiva: false,
    passwordHash: null,
    telefono: null,
    correoElectronico: null,
    ...overrides,
  } as unknown as Habitante;
}

describe('HabitanteAuthService', () => {
  let habitanteRepository: jest.Mocked<Repository<Habitante>>;
  let refreshTokenRepository: jest.Mocked<Repository<HabitanteRefreshToken>>;
  let service: HabitanteAuthService;
  const HOY = new Date('2026-07-20T00:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(HOY);
    habitanteRepository = crearRepositorioFalso<Habitante>();
    refreshTokenRepository = crearRepositorioFalso<HabitanteRefreshToken>();

    const jwtService = new JwtService({ secret: 'test-habitante-secret' });
    const configService = new ConfigService({
      JWT_HABITANTE_ACCESS_SECRET: 'test-habitante-secret',
      JWT_HABITANTE_ACCESS_EXPIRES_IN: '15m',
      JWT_HABITANTE_REFRESH_EXPIRES_IN: '7d',
    });

    service = new HabitanteAuthService(habitanteRepository, refreshTokenRepository, jwtService, configService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('registrar', () => {
    it('activa la credencial de un habitante mayor de edad ya censado', async () => {
      const habitante = crearHabitante();
      habitanteRepository.find.mockResolvedValue([habitante]);

      const resultado = await service.registrar({
        tipoDocumentoId: 1,
        numeroDocumento: '123456',
        fechaNacimiento: '2000-01-15',
        passwordNueva: 'ClaveSegura123',
      });

      expect(resultado).toEqual({ habitanteId: 1 });
      expect(habitante.credencialActiva).toBe(true);
      expect(habitante.passwordHash).toEqual(expect.any(String));
    });

    it('rechaza si no hay ningún habitante con ese documento', async () => {
      habitanteRepository.find.mockResolvedValue([]);

      await expect(
        service.registrar({ tipoDocumentoId: 1, numeroDocumento: '999', fechaNacimiento: '2000-01-15', passwordNueva: 'ClaveSegura123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si la fecha de nacimiento no coincide (2do factor)', async () => {
      habitanteRepository.find.mockResolvedValue([crearHabitante({ fechaNacimiento: '2000-01-15' })]);

      await expect(
        service.registrar({
          tipoDocumentoId: 1,
          numeroDocumento: '123456',
          fechaNacimiento: '1999-05-01',
          passwordNueva: 'ClaveSegura123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza el registro de un menor de edad', async () => {
      habitanteRepository.find.mockResolvedValue([crearHabitante({ fechaNacimiento: '2015-01-15' })]);

      await expect(
        service.registrar({
          tipoDocumentoId: 1,
          numeroDocumento: '123456',
          fechaNacimiento: '2015-01-15',
          passwordNueva: 'ClaveSegura123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si ya existe una credencial activa', async () => {
      habitanteRepository.find.mockResolvedValue([crearHabitante({ credencialActiva: true })]);

      await expect(
        service.registrar({
          tipoDocumentoId: 1,
          numeroDocumento: '123456',
          fechaNacimiento: '2000-01-15',
          passwordNueva: 'ClaveSegura123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('rechaza si hay colisión de documento+fecha de nacimiento entre comunidades distintas', async () => {
      habitanteRepository.find.mockResolvedValue([
        crearHabitante({ id: 1, comunidadId: 100 }),
        crearHabitante({ id: 2, comunidadId: 200 }),
      ]);

      await expect(
        service.registrar({
          tipoDocumentoId: 1,
          numeroDocumento: '123456',
          fechaNacimiento: '2000-01-15',
          passwordNueva: 'ClaveSegura123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('emite tokens con credenciales correctas', async () => {
      const habitante = crearHabitante({ credencialActiva: true, passwordHash: await bcrypt.hash('ClaveSegura123', 4) });
      habitanteRepository.find.mockResolvedValue([habitante]);

      const tokens = await service.login({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'ClaveSegura123' });

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });

    it('rechaza con contraseña incorrecta', async () => {
      const habitante = crearHabitante({ credencialActiva: true, passwordHash: await bcrypt.hash('ClaveSegura123', 4) });
      habitanteRepository.find.mockResolvedValue([habitante]);

      await expect(
        service.login({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'clave-incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el habitante fue dado de baja', async () => {
      const habitante = crearHabitante({
        credencialActiva: true,
        passwordHash: await bcrypt.hash('ClaveSegura123', 4),
        estado: EstadoHabitante.FALLECIDO,
      });
      habitanteRepository.find.mockResolvedValue([habitante]);

      await expect(
        service.login({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'ClaveSegura123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('autentica al candidato correcto entre varios con el mismo documento en comunidades distintas', async () => {
      const otro = crearHabitante({ id: 2, comunidadId: 200, passwordHash: await bcrypt.hash('OtraClave456', 4), credencialActiva: true });
      const correcto = crearHabitante({
        id: 1,
        comunidadId: 100,
        passwordHash: await bcrypt.hash('ClaveSegura123', 4),
        credencialActiva: true,
      });
      habitanteRepository.find.mockResolvedValue([otro, correcto]);

      const tokens = await service.login({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'ClaveSegura123' });

      expect(tokens.accessToken).toEqual(expect.any(String));
    });
  });

  describe('refrescar', () => {
    it('rota el refresh token: revoca el usado y emite uno nuevo', async () => {
      const habitante = crearHabitante({ credencialActiva: true });
      habitanteRepository.findOne.mockResolvedValue(habitante);
      const refreshTokenPlano = 'refresh-token-plano-de-prueba';
      const tokenAlmacenado = {
        id: 10,
        habitanteId: 1,
        tokenHash: await bcrypt.hash(refreshTokenPlano, 4),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      } as HabitanteRefreshToken;
      refreshTokenRepository.find.mockResolvedValue([tokenAlmacenado]);

      const tokens = await service.refrescar(refreshTokenPlano);

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokenAlmacenado.revokedAt).not.toBeNull();
    });

    it('rechaza un refresh token que no coincide con ninguno almacenado', async () => {
      refreshTokenRepository.find.mockResolvedValue([]);

      await expect(service.refrescar('token-inexistente')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el habitante fue dado de baja después de emitido el refresh token', async () => {
      const refreshTokenPlano = 'refresh-token-plano';
      refreshTokenRepository.find.mockResolvedValue([
        {
          id: 10,
          habitanteId: 1,
          tokenHash: await bcrypt.hash(refreshTokenPlano, 4),
          expiresAt: new Date(Date.now() + 60_000),
          revokedAt: null,
        } as HabitanteRefreshToken,
      ]);
      habitanteRepository.findOne.mockResolvedValue(crearHabitante({ credencialActiva: true, estado: EstadoHabitante.FALLECIDO }));

      await expect(service.refrescar(refreshTokenPlano)).rejects.toThrow(UnauthorizedException);
    });
  });
});
