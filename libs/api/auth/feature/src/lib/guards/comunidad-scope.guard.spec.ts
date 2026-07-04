import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ComunidadScopeGuard } from './comunidad-scope.guard';

function crearContexto(usuario: UsuarioAutenticado | undefined, params: Record<string, string> = {}): ExecutionContext {
  const request = { user: usuario, params, body: {}, query: {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function crearReflectorConRoles(roles: RolCodigo[] | undefined): Reflector {
  return { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
}

describe('ComunidadScopeGuard', () => {
  it('permite el acceso si la ruta no trae comunidadId', () => {
    const guard = new ComunidadScopeGuard(crearReflectorConRoles([RolCodigo.CENSISTA]));
    const usuario: UsuarioAutenticado = {
      id: 1,
      email: 'a@a.com',
      roles: [RolCodigo.CENSISTA],
      asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 5 }],
    };

    expect(guard.canActivate(crearContexto(usuario))).toBe(true);
  });

  it('permite el acceso a un usuario con asignación global (comunidadId null), p.ej. analista', () => {
    const guard = new ComunidadScopeGuard(crearReflectorConRoles([RolCodigo.ANALISTA]));
    const usuario: UsuarioAutenticado = {
      id: 2,
      email: 'analista@a.com',
      roles: [RolCodigo.ANALISTA],
      asignaciones: [{ rol: RolCodigo.ANALISTA, comunidadId: null }],
    };

    expect(guard.canActivate(crearContexto(usuario, { comunidadId: '7' }))).toBe(true);
  });

  it('permite el acceso a un censista asignado exactamente a esa comunidad', () => {
    const guard = new ComunidadScopeGuard(crearReflectorConRoles([RolCodigo.CENSISTA]));
    const usuario: UsuarioAutenticado = {
      id: 3,
      email: 'censista@a.com',
      roles: [RolCodigo.CENSISTA],
      asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 5 }],
    };

    expect(guard.canActivate(crearContexto(usuario, { comunidadId: '5' }))).toBe(true);
  });

  it('rechaza a un censista asignado a otra comunidad distinta a la solicitada', () => {
    const guard = new ComunidadScopeGuard(crearReflectorConRoles([RolCodigo.CENSISTA]));
    const usuario: UsuarioAutenticado = {
      id: 4,
      email: 'censista2@a.com',
      roles: [RolCodigo.CENSISTA],
      asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 5 }],
    };

    expect(() => guard.canActivate(crearContexto(usuario, { comunidadId: '9' }))).toThrow(ForbiddenException);
  });

  it('rechaza si no hay usuario autenticado y la ruta pide comunidadId', () => {
    const guard = new ComunidadScopeGuard(crearReflectorConRoles([RolCodigo.CENSISTA]));
    expect(() => guard.canActivate(crearContexto(undefined, { comunidadId: '5' }))).toThrow(ForbiddenException);
  });
});
