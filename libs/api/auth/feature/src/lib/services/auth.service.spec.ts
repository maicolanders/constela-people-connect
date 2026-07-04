import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken, Rol, Usuario, UsuarioRol } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';

function crearRepositorioFalso<T extends object>(): jest.Mocked<Repository<T>> {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((valor) => valor),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('AuthService', () => {
  let usuarioRepository: jest.Mocked<Repository<Usuario>>;
  let usuarioRolRepository: jest.Mocked<Repository<UsuarioRol>>;
  let refreshTokenRepository: jest.Mocked<Repository<RefreshToken>>;
  let authService: AuthService;
  let usuario: Usuario;

  beforeEach(async () => {
    usuarioRepository = crearRepositorioFalso<Usuario>();
    usuarioRolRepository = crearRepositorioFalso<UsuarioRol>();
    refreshTokenRepository = crearRepositorioFalso<RefreshToken>();

    usuario = {
      id: 1,
      nombre: 'Ana',
      apellido: 'Tunubala',
      email: 'ana@censo.test',
      passwordHash: await bcrypt.hash('ClaveSegura123', 4),
      activo: true,
    } as Usuario;

    const rolAdmin = { codigo: RolCodigo.ADMINISTRADOR } as Rol;
    usuarioRolRepository.find.mockResolvedValue([
      { id: 1, usuarioId: 1, rolId: 1, comunidadId: null, rol: rolAdmin } as UsuarioRol,
    ]);

    const jwtService = new JwtService({ secret: 'test-secret' });
    const configService = new ConfigService({
      JWT_ACCESS_SECRET: 'test-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });

    authService = new AuthService(usuarioRepository, usuarioRolRepository, refreshTokenRepository, jwtService, configService);
  });

  describe('login', () => {
    it('retorna un par de tokens con credenciales válidas', async () => {
      usuarioRepository.findOne.mockResolvedValue(usuario);

      const tokens = await authService.login('ana@censo.test', 'ClaveSegura123');

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokens.refreshToken).toEqual(expect.any(String));
      expect(refreshTokenRepository.save).toHaveBeenCalledTimes(1);
    });

    it('rechaza con contraseña incorrecta', async () => {
      usuarioRepository.findOne.mockResolvedValue(usuario);

      await expect(authService.login('ana@censo.test', 'clave-incorrecta')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el usuario no existe', async () => {
      usuarioRepository.findOne.mockResolvedValue(null);

      await expect(authService.login('no-existe@censo.test', 'ClaveSegura123')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza si el usuario está inactivo', async () => {
      usuarioRepository.findOne.mockResolvedValue({ ...usuario, activo: false });

      await expect(authService.login('ana@censo.test', 'ClaveSegura123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refrescar', () => {
    it('rota el refresh token: revoca el usado y emite uno nuevo', async () => {
      usuarioRepository.findOne.mockResolvedValue(usuario);
      const refreshTokenPlano = 'refresh-token-plano-de-prueba';
      const tokenAlmacenado = {
        id: 10,
        usuarioId: 1,
        tokenHash: await bcrypt.hash(refreshTokenPlano, 4),
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
      } as RefreshToken;
      refreshTokenRepository.find.mockResolvedValue([tokenAlmacenado]);

      const tokens = await authService.refrescar(refreshTokenPlano);

      expect(tokens.accessToken).toEqual(expect.any(String));
      expect(tokenAlmacenado.revokedAt).not.toBeNull();
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 10, revokedAt: expect.any(Date) }));
    });

    it('rechaza un refresh token que no coincide con ninguno almacenado', async () => {
      refreshTokenRepository.find.mockResolvedValue([]);

      await expect(authService.refrescar('token-inexistente')).rejects.toThrow(UnauthorizedException);
    });

    it('rechaza un refresh token ya expirado', async () => {
      const refreshTokenPlano = 'refresh-expirado';
      refreshTokenRepository.find.mockResolvedValue([
        {
          id: 11,
          usuarioId: 1,
          tokenHash: await bcrypt.hash(refreshTokenPlano, 4),
          expiresAt: new Date(Date.now() - 1000),
          revokedAt: null,
        } as RefreshToken,
      ]);

      await expect(authService.refrescar(refreshTokenPlano)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('obtenerPerfil', () => {
    it('retorna el perfil con roles y asignaciones', async () => {
      usuarioRepository.findOne.mockResolvedValue(usuario);

      const perfil = await authService.obtenerPerfil(1);

      expect(perfil).toEqual({
        id: 1,
        email: 'ana@censo.test',
        roles: [RolCodigo.ADMINISTRADOR],
        asignaciones: [{ rol: RolCodigo.ADMINISTRADOR, comunidadId: null }],
      });
    });
  });
});
