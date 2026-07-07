import { SyncOperacionEntrada } from '@censo/api-shared-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { EducacionSyncHandler } from './educacion-sync.handler';

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
    uuid: 'educacion-uuid-1',
    operacion: 'crear',
    actualizadoEnCliente: new Date('2026-07-06T00:00:00.000Z').toISOString(),
    payload: {
      habitanteUuid: 'habitante-uuid-1',
      alfabetizado: true,
      nivelEducativoCatalogoItemId: 5,
      asisteEscuela: false,
      lenguas: [],
    },
    ...overrides,
  };
}

describe('EducacionSyncHandler', () => {
  function crearHandler(opciones: { habitanteExistente?: { id: number } | null } = {}) {
    const habitanteService = { obtenerPorUuid: jest.fn().mockResolvedValue(opciones.habitanteExistente ?? null) };
    const educacionService = {
      crearParaHabitante: jest.fn().mockImplementation((habitanteId, dto) => Promise.resolve({ id: 1, habitanteId, ...dto })),
    };
    const authService = { obtenerPerfil: jest.fn().mockResolvedValue(crearUsuario()) };
    const registry = { registrar: jest.fn() };

    const handler = new EducacionSyncHandler(educacionService as never, habitanteService as never, authService as never, registry as never);
    return { handler, habitanteService, educacionService, registry };
  }

  it('se registra en el SyncHandlerRegistry bajo el dominio "educaciones"', () => {
    const { handler, registry } = crearHandler();
    handler.onModuleInit();
    expect(registry.registrar).toHaveBeenCalledWith('educaciones', handler);
  });

  it('resuelve habitanteUuid -> habitanteId antes de crear el registro', async () => {
    const { handler, habitanteService, educacionService } = crearHandler({ habitanteExistente: { id: 20 } });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(habitanteService.obtenerPorUuid).toHaveBeenCalledWith('habitante-uuid-1');
    expect(educacionService.crearParaHabitante).toHaveBeenCalledWith(20, expect.objectContaining({ alfabetizado: true }), expect.anything());
    expect(resultados).toEqual([expect.objectContaining({ uuid: 'educacion-uuid-1', estado: 'aplicado' })]);
  });

  it('marca error (para reintento) si el habitante todavía no está sincronizado', async () => {
    const { handler, educacionService } = crearHandler({ habitanteExistente: null });

    const resultados = await handler.aplicarLote([crearOperacion()], 1);

    expect(educacionService.crearParaHabitante).not.toHaveBeenCalled();
    expect(resultados).toEqual([expect.objectContaining({ estado: 'error' })]);
  });

  it('rechaza la operación "eliminar"', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacion({ operacion: 'eliminar' })], 1);

    expect(resultados[0].estado).toBe('error');
  });
});
