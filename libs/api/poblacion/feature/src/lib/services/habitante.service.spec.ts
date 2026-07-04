import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { DecisionRevisionDuplicado, EstadoHabitante, RolCodigo, SexoHabitante } from '@censo/shared-data-access';
import { CrearHabitanteDto } from '../dto/crear-habitante.dto';
import { HabitanteService } from './habitante.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }],
  };
}

function crearManagerFake(habitanteSimilarExistente: { id: number; uuid: string } | null = null) {
  let siguienteId = 100;
  const guardados: Array<{ entidad: unknown; datos: Record<string, unknown> }> = [];
  return {
    guardados,
    create: jest.fn((_entidad: unknown, datos: Record<string, unknown>) => ({ ...datos })),
    save: jest.fn(async (entidad: unknown, datos: Record<string, unknown>) => {
      const guardado = { id: (datos['id'] as number | undefined) ?? siguienteId++, ...datos };
      guardados.push({ entidad, datos: guardado });
      return guardado;
    }),
    findOneBy: jest.fn(async (_entidad: unknown, criterio: { uuid?: string }) =>
      habitanteSimilarExistente && criterio.uuid === habitanteSimilarExistente.uuid ? habitanteSimilarExistente : null,
    ),
  };
}

describe('HabitanteService.crear', () => {
  const hogar = { id: 10, uuid: 'hogar-uuid', comunidadId: 3, jefeHogarId: null };
  const dtoBase: CrearHabitanteDto = {
    uuid: 'habitante-uuid-1',
    hogarId: 10,
    periodoCensalId: 1,
    nombres: 'Ana',
    apellidos: 'Perez',
    fechaNacimiento: '1990-05-01',
    sexo: SexoHabitante.FEMENINO,
    parentescoCatalogoItemId: 55,
  };

  function crearServicio(overrides: { duplicadoDocumento?: unknown; itemParentesco?: unknown; manager?: ReturnType<typeof crearManagerFake> } = {}) {
    const manager = overrides.manager ?? crearManagerFake();
    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(overrides.duplicadoDocumento ?? null),
    };
    const parentescoRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
    const catalogoItemRepository = {
      findOne: jest.fn().mockResolvedValue(overrides.itemParentesco ?? { id: 55, codigo: 'hijo' }),
    };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const hogarService = { obtener: jest.fn().mockResolvedValue(hogar), actualizarJefeHogar: jest.fn() };
    const periodoCensalService = { assertAbierto: jest.fn().mockResolvedValue(undefined) };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      parentescoRepository as never,
      catalogoItemRepository as never,
      dataSource as never,
      hogarService as never,
      periodoCensalService as never,
    );

    return { servicio, manager, habitanteRepository, catalogoItemRepository, hogarService, periodoCensalService };
  }

  it('rechaza un documento duplicado dentro de la misma comunidad (RF-01-01)', async () => {
    const { servicio } = crearServicio({ duplicadoDocumento: { id: 999 } });

    await expect(
      servicio.crear({ ...dtoBase, numeroDocumento: '12345' }, crearUsuario()),
    ).rejects.toThrow(ConflictException);
  });

  it('rechaza si el usuario no tiene acceso a la comunidad del hogar', async () => {
    const { servicio, hogarService } = crearServicio();
    hogarService.obtener.mockRejectedValueOnce(new ForbiddenException('No tiene acceso a esta comunidad'));

    await expect(servicio.crear(dtoBase, crearUsuario(9))).rejects.toThrow(ForbiddenException);
  });

  it('crea el habitante, su parentesco, y persiste las revisiones de duplicado (resueltas por uuid) en una sola transacción', async () => {
    const manager = crearManagerFake({ id: 42, uuid: 'habitante-similar-uuid' });
    const { servicio } = crearServicio({ itemParentesco: { id: 55, codigo: 'hijo' }, manager });

    const habitante = await servicio.crear(
      {
        ...dtoBase,
        revisionesDuplicado: [
          { habitanteSimilarUuid: 'habitante-similar-uuid', scoreSimilitud: 0.8, justificacion: 'nombres distintos' },
        ],
      },
      crearUsuario(),
    );

    expect(habitante.hogarId).toBe(10);
    expect(habitante.comunidadId).toBe(3);

    const entidadesGuardadas = manager.guardados.map((g) => (g.entidad as { name: string }).name);
    expect(entidadesGuardadas).toContain(Habitante.name);
    expect(entidadesGuardadas).toContain('HabitanteParentesco');
    expect(entidadesGuardadas).toContain('HabitanteRevisionDuplicado');

    const revision = manager.guardados.find((g) => (g.entidad as { name: string }).name === 'HabitanteRevisionDuplicado');
    expect((revision?.datos as { habitanteSimilarId?: number }).habitanteSimilarId).toBe(42);
  });

  it('omite (best-effort) una revisión de duplicado cuyo habitante similar aún no está sincronizado', async () => {
    const manager = crearManagerFake(null);
    const { servicio } = crearServicio({ itemParentesco: { id: 55, codigo: 'hijo' }, manager });

    await servicio.crear(
      {
        ...dtoBase,
        revisionesDuplicado: [{ habitanteSimilarUuid: 'no-sincronizado-todavia', scoreSimilitud: 0.8 }],
      },
      crearUsuario(),
    );

    const entidadesGuardadas = manager.guardados.map((g) => (g.entidad as { name: string }).name);
    expect(entidadesGuardadas).not.toContain('HabitanteRevisionDuplicado');
  });

  it('si el parentesco es "jefe_hogar", actualiza Hogar.jefeHogarId dentro de la misma transacción', async () => {
    const { servicio, manager } = crearServicio({ itemParentesco: { id: 55, codigo: 'jefe_hogar' } });

    await servicio.crear(dtoBase, crearUsuario());

    const guardadoHogar = manager.guardados.find((g) => (g.datos as { id?: number }).id === hogar.id);
    expect(guardadoHogar).toBeDefined();
    expect((guardadoHogar?.datos as { jefeHogarId?: number }).jefeHogarId).toBeDefined();
  });

  it('genera identificadorInterno = uuid cuando no hay número de documento', async () => {
    const { servicio } = crearServicio();

    const habitante = await servicio.crear(dtoBase, crearUsuario());

    expect(habitante.identificadorInterno).toBe(dtoBase.uuid);
    expect(habitante.numeroDocumento).toBeNull();
  });

  it('es idempotente por uuid: si el habitante ya existe, lo devuelve sin reprocesar', async () => {
    const habitanteRepository = { findOne: jest.fn().mockResolvedValue({ id: 1, uuid: dtoBase.uuid }) };
    const dataSource = { transaction: jest.fn() };
    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      dataSource as never,
      {} as never,
      {} as never,
    );

    const habitante = await servicio.crear(dtoBase, crearUsuario());

    expect(habitante).toEqual({ id: 1, uuid: dtoBase.uuid });
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

describe('HabitanteService.actualizar', () => {
  it('estados de dar-de-baja (RF-01-02) no son un soft-delete: el registro sigue siendo consultable', async () => {
    const habitanteExistente = {
      id: 1,
      uuid: 'u-1',
      comunidadId: 3,
      hogarId: 10,
      periodoCensalId: 1,
      estado: EstadoHabitante.ACTIVO,
    };
    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValue(habitanteExistente),
      save: jest.fn(async (entidad: unknown) => entidad),
    };
    const periodoCensalService = { assertAbierto: jest.fn().mockResolvedValue(undefined) };
    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      periodoCensalService as never,
    );

    const resultado = await servicio.darBaja(
      1,
      { estado: EstadoHabitante.FALLECIDO, periodoBajaId: 2, motivoBaja: 'defunción registrada' },
      crearUsuario(),
    );

    expect(resultado.estado).toBe(EstadoHabitante.FALLECIDO);
    expect(resultado.periodoBajaId).toBe(2);
    // softRemove del repositorio NO se invoca: dar de baja es una transición de estado, no un soft-delete.
    expect(habitanteRepository.save).toHaveBeenCalled();
  });
});

// Referencia cruzada de RF-01-05 usada por el servicio (no se reimplementa el algoritmo aquí, ver similitud-duplicados.spec.ts).
describe('DecisionRevisionDuplicado', () => {
  it('solo define el valor confirmado_no_duplicado por ahora', () => {
    expect(DecisionRevisionDuplicado.CONFIRMADO_NO_DUPLICADO).toBe('confirmado_no_duplicado');
  });
});
