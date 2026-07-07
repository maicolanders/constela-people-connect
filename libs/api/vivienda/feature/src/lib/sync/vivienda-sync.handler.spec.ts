import { SyncOperacionEntrada } from '@censo/api-shared-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { ViviendaSyncHandler } from './vivienda-sync.handler';

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
    uuid: 'vivienda-uuid-1',
    operacion: 'crear',
    actualizadoEnCliente: new Date('2026-07-06T00:00:00.000Z').toISOString(),
    payload: {
      hogarUuid: 'hogar-uuid-1',
      tipoViviendaCatalogoItemId: 1,
      materialParedCatalogoItemId: 2,
      materialPisoCatalogoItemId: 3,
      materialTechoCatalogoItemId: 4,
      numeroDormitorios: 2,
      servicios: [],
    },
    ...overrides,
  };
}

describe('ViviendaSyncHandler', () => {
  function crearHandler(opciones: { hogarExistente?: { id: number } | null } = {}) {
    const hogarService = { obtenerPorUuid: jest.fn().mockResolvedValue(opciones.hogarExistente ?? null) };
    const viviendaService = { crearParaHogar: jest.fn().mockImplementation((hogarId, dto) => Promise.resolve({ id: 1, hogarId, ...dto })) };
    const authService = { obtenerPerfil: jest.fn().mockResolvedValue(crearUsuario()) };
    const registry = { registrar: jest.fn() };

    const handler = new ViviendaSyncHandler(viviendaService as never, hogarService as never, authService as never, registry as never);
    return { handler, hogarService, viviendaService, registry };
  }

  it('se registra en el SyncHandlerRegistry bajo el dominio "viviendas"', () => {
    const { handler, registry } = crearHandler();
    handler.onModuleInit();
    expect(registry.registrar).toHaveBeenCalledWith('viviendas', handler);
  });

  it('resuelve hogarUuid -> hogarId antes de crear la vivienda', async () => {
    const { handler, hogarService, viviendaService } = crearHandler({ hogarExistente: { id: 10 } });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(hogarService.obtenerPorUuid).toHaveBeenCalledWith('hogar-uuid-1');
    expect(viviendaService.crearParaHogar).toHaveBeenCalledWith(10, expect.objectContaining({ numeroDormitorios: 2 }), expect.anything());
    expect(resultados).toEqual([expect.objectContaining({ uuid: 'vivienda-uuid-1', estado: 'aplicado' })]);
  });

  it('marca error (para reintento) si el hogar todavía no está sincronizado', async () => {
    const { handler, viviendaService } = crearHandler({ hogarExistente: null });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(viviendaService.crearParaHogar).not.toHaveBeenCalled();
    expect(resultados).toEqual([expect.objectContaining({ estado: 'error' })]);
  });

  it('rechaza la operación "eliminar"', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacion({ operacion: 'eliminar' })], 1);

    expect(resultados[0].estado).toBe('error');
  });
});
