import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { RolesGuard } from './roles.guard';

function crearContexto(usuario?: UsuarioAutenticado): ExecutionContext {
  const request = { user: usuario };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function crearUsuario(roles: RolCodigo[]): UsuarioAutenticado {
  return {
    id: 1,
    email: 'test@censo.test',
    roles,
    asignaciones: roles.map((rol) => ({ rol, comunidadId: null })),
  };
}

describe('RolesGuard', () => {
  it('permite el acceso si la ruta no requiere ningún rol', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(crearContexto(crearUsuario([RolCodigo.CENSISTA])))).toBe(true);
  });

  it('permite el acceso si el usuario tiene alguno de los roles requeridos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RolCodigo.ADMINISTRADOR, RolCodigo.ANALISTA]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(crearContexto(crearUsuario([RolCodigo.ANALISTA])))).toBe(true);
  });

  it('rechaza el acceso si el usuario no tiene ninguno de los roles requeridos', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RolCodigo.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(crearContexto(crearUsuario([RolCodigo.CENSISTA])))).toThrow(ForbiddenException);
  });

  it('rechaza el acceso si no hay usuario autenticado en la petición', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RolCodigo.ADMINISTRADOR]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(crearContexto(undefined))).toThrow(ForbiddenException);
  });
});
