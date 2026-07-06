import { SyncOperacionEntrada } from '@censo/api-shared-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { ClasificacionUbicacion, RolCodigo } from '@censo/shared-data-access';
import { HogarUbicacionesSyncHandler } from './hogar-ubicaciones-sync.handler';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

function crearOperacion(overrides: Partial<SyncOperacionEntrada> = {}): SyncOperacionEntrada {
  return {
    uuid: 'ubicacion-uuid-1',
    operacion: 'crear',
    actualizadoEnCliente: new Date('2026-07-06T00:00:00.000Z').toISOString(),
    payload: {
      hogarUuid: 'hogar-uuid-1',
      ubicacionGeograficaId: 7,
      latitud: 2.44,
      longitud: -76.6,
      capturadoEn: '2026-07-06T10:00:00.000Z',
      clasificacion: ClasificacionUbicacion.RURAL,
    },
    ...overrides,
  };
}

describe('HogarUbicacionesSyncHandler', () => {
  function crearHandler(opciones: { hogarExistente?: { id: number } | null } = {}) {
    const hogarService = {
      obtenerPorUuid: jest.fn().mockResolvedValue(opciones.hogarExistente ?? null),
      registrarUbicacion: jest.fn().mockImplementation((hogarId, dto) => Promise.resolve({ id: 1, hogarId, ...dto })),
    };
    const authService = { obtenerPerfil: jest.fn().mockResolvedValue(crearUsuario()) };
    const registry = { registrar: jest.fn() };

    const handler = new HogarUbicacionesSyncHandler(hogarService as never, authService as never, registry as never);
    return { handler, hogarService, authService, registry };
  }

  it('se registra en el SyncHandlerRegistry bajo el dominio "hogar-ubicaciones"', () => {
    const { handler, registry } = crearHandler();
    handler.onModuleInit();
    expect(registry.registrar).toHaveBeenCalledWith('hogar-ubicaciones', handler);
  });

  it('resuelve hogarUuid -> hogarId antes de registrar la ubicación', async () => {
    const { handler, hogarService } = crearHandler({ hogarExistente: { id: 10 } });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(hogarService.obtenerPorUuid).toHaveBeenCalledWith('hogar-uuid-1');
    expect(hogarService.registrarUbicacion).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ ubicacionGeograficaId: 7 }),
      expect.anything(),
    );
    expect(resultados).toEqual([expect.objectContaining({ uuid: 'ubicacion-uuid-1', estado: 'aplicado' })]);
  });

  it('marca error (para reintento) si el hogar todavía no está sincronizado', async () => {
    const { handler, hogarService } = crearHandler({ hogarExistente: null });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(hogarService.registrarUbicacion).not.toHaveBeenCalled();
    expect(resultados).toEqual([expect.objectContaining({ estado: 'error' })]);
  });

  it('rechaza la operación "eliminar"', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacion({ operacion: 'eliminar' })], 1);

    expect(resultados[0].estado).toBe('error');
  });

  it('devuelve error para todas las operaciones si no hay usuario identificado', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacion()], null);

    expect(resultados).toEqual([expect.objectContaining({ estado: 'error', mensaje: 'Usuario no identificado' })]);
  });
});
