import { SyncOperacionEntrada } from '@censo/api-shared-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { HabitantesSyncHandler } from './habitantes-sync.handler';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

function crearOperacionCrear(overrides: Partial<SyncOperacionEntrada> = {}): SyncOperacionEntrada {
  return {
    uuid: 'habitante-uuid-1',
    operacion: 'crear',
    actualizadoEnCliente: new Date('2026-07-01T00:00:00.000Z').toISOString(),
    payload: {
      hogarUuid: 'hogar-uuid-1',
      periodoCensalId: 1,
      nombres: 'Ana',
      apellidos: 'Perez',
      fechaNacimiento: '1990-05-01',
      sexo: 'F',
      parentescoCatalogoItemId: 55,
    },
    ...overrides,
  };
}

describe('HabitantesSyncHandler', () => {
  function crearHandler(opciones: { hogarExistente?: { id: number } | null } = {}) {
    const hogarService = {
      obtenerPorUuid: jest.fn().mockResolvedValue(opciones.hogarExistente ?? null),
    };
    const habitanteService = {
      crear: jest.fn().mockImplementation((dto) => Promise.resolve({ ...dto, id: 200 })),
      obtenerPorUuid: jest.fn().mockResolvedValue(null),
      actualizar: jest.fn(),
    };
    const authService = { obtenerPerfil: jest.fn().mockResolvedValue(crearUsuario()) };
    const registry = { registrar: jest.fn() };

    const handler = new HabitantesSyncHandler(
      habitanteService as never,
      hogarService as never,
      authService as never,
      registry as never,
    );

    return { handler, hogarService, habitanteService, authService, registry };
  }

  it('se registra en el SyncHandlerRegistry bajo el dominio "habitantes" al inicializar el módulo', () => {
    const { handler, registry } = crearHandler();
    handler.onModuleInit();
    expect(registry.registrar).toHaveBeenCalledWith('habitantes', handler);
  });

  it('resuelve hogarUuid -> hogarId antes de crear el habitante', async () => {
    const { handler, hogarService, habitanteService } = crearHandler({ hogarExistente: { id: 10 } });

    const resultados = await handler.aplicarLote([crearOperacionCrear()], 1);

    expect(hogarService.obtenerPorUuid).toHaveBeenCalledWith('hogar-uuid-1');
    expect(habitanteService.crear).toHaveBeenCalledWith(
      expect.objectContaining({ hogarId: 10, uuid: 'habitante-uuid-1' }),
      expect.anything(),
    );
    expect(resultados).toEqual([expect.objectContaining({ uuid: 'habitante-uuid-1', estado: 'aplicado' })]);
  });

  it('marca error (para reintento) si el hogar todavía no está sincronizado en el servidor', async () => {
    const { handler, habitanteService } = crearHandler({ hogarExistente: null });

    const resultados = await handler.aplicarLote([crearOperacionCrear()], 1);

    expect(habitanteService.crear).not.toHaveBeenCalled();
    expect(resultados).toEqual([
      expect.objectContaining({ uuid: 'habitante-uuid-1', estado: 'error' }),
    ]);
  });

  it('devuelve error para todas las operaciones si no hay usuario identificado', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote([crearOperacionCrear()], null);

    expect(resultados).toEqual([expect.objectContaining({ estado: 'error', mensaje: 'Usuario no identificado' })]);
  });

  it('rechaza la operación "eliminar": un habitante se da de baja, no se elimina por sync', async () => {
    const { handler } = crearHandler();

    const resultados = await handler.aplicarLote(
      [crearOperacionCrear({ operacion: 'eliminar' })],
      1,
    );

    expect(resultados[0].estado).toBe('error');
  });
});
