import { SyncOperacionEntrada } from '@censo/api-shared-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { EtniaVulnerabilidadSyncHandler } from './etnia-vulnerabilidad-sync.handler';

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
    uuid: 'etnia-uuid-1',
    operacion: 'crear',
    actualizadoEnCliente: new Date('2026-07-06T00:00:00.000Z').toISOString(),
    payload: {
      habitanteUuid: 'habitante-uuid-1',
      etniaCatalogoItemId: 5,
      condicionesVulnerabilidad: [],
    },
    ...overrides,
  };
}

describe('EtniaVulnerabilidadSyncHandler', () => {
  function crearHandler(opciones: { habitanteExistente?: { id: number } | null } = {}) {
    const habitanteService = { obtenerPorUuid: jest.fn().mockResolvedValue(opciones.habitanteExistente ?? null) };
    const etniaVulnerabilidadService = {
      crearParaHabitante: jest.fn().mockImplementation((habitanteId, dto) => Promise.resolve({ id: 1, habitanteId, ...dto })),
    };
    const authService = { obtenerPerfil: jest.fn().mockResolvedValue(crearUsuario()) };
    const registry = { registrar: jest.fn() };

    const handler = new EtniaVulnerabilidadSyncHandler(
      etniaVulnerabilidadService as never,
      habitanteService as never,
      authService as never,
      registry as never,
    );
    return { handler, habitanteService, etniaVulnerabilidadService, registry };
  }

  it('se registra en el SyncHandlerRegistry bajo el dominio "etnias-vulnerabilidad"', () => {
    const { handler, registry } = crearHandler();
    handler.onModuleInit();
    expect(registry.registrar).toHaveBeenCalledWith('etnias-vulnerabilidad', handler);
  });

  it('resuelve habitanteUuid -> habitanteId antes de crear el registro', async () => {
    const { handler, habitanteService, etniaVulnerabilidadService } = crearHandler({ habitanteExistente: { id: 20 } });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(habitanteService.obtenerPorUuid).toHaveBeenCalledWith('habitante-uuid-1');
    expect(etniaVulnerabilidadService.crearParaHabitante).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ etniaCatalogoItemId: 5 }),
      expect.anything(),
    );
    expect(resultados).toEqual([expect.objectContaining({ uuid: 'etnia-uuid-1', estado: 'aplicado' })]);
  });

  it('marca error (para reintento) si el habitante todavía no está sincronizado', async () => {
    const { handler, etniaVulnerabilidadService } = crearHandler({ habitanteExistente: null });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(etniaVulnerabilidadService.crearParaHabitante).not.toHaveBeenCalled();
    expect(resultados).toEqual([expect.objectContaining({ estado: 'error' })]);
  });

  it('rechaza la operación "eliminar"', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacion({ operacion: 'eliminar' })], 1);

    expect(resultados[0].estado).toBe('error');
  });
});
