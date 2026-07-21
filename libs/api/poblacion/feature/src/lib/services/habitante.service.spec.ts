import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Like } from 'typeorm';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { DecisionRevisionDuplicado, EstadoHabitante, EstadoHogar, RolCodigo, SexoHabitante } from '@censo/shared-data-access';
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

  it('RF-02-01: con edadEstimada sintetiza fechaNacimiento (1 de enero del año aproximado)', async () => {
    const { servicio } = crearServicio();
    const anioActual = new Date().getFullYear();

    const habitante = await servicio.crear(
      { ...dtoBase, fechaNacimiento: undefined, edadEstimada: true, edadAproximada: 30 },
      crearUsuario(),
    );

    expect(habitante.fechaNacimiento).toBe(`${anioActual - 30}-01-01`);
    expect(habitante.edadEstimada).toBe(true);
  });

  it('rechaza edadEstimada=true sin edadAproximada', async () => {
    const { servicio } = crearServicio();

    await expect(
      servicio.crear({ ...dtoBase, fechaNacimiento: undefined, edadEstimada: true }, crearUsuario()),
    ).rejects.toThrow(BadRequestException);
  });

  it('guarda identidadGeneroCatalogoItemId cuando se provee', async () => {
    const { servicio } = crearServicio();

    const habitante = await servicio.crear({ ...dtoBase, identidadGeneroCatalogoItemId: 77 }, crearUsuario());

    expect(habitante.identidadGeneroCatalogoItemId).toBe(77);
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

describe('HabitanteService.listar — paginación y búsqueda por documento', () => {
  function crearServicio() {
    const habitanteRepository = { find: jest.fn().mockResolvedValue([]) };
    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    return { servicio, habitanteRepository };
  }

  it('aplica take/skip cuando se envían limit/offset', async () => {
    const { servicio, habitanteRepository } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, limit: 30, offset: 60 });

    expect(habitanteRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: 30, skip: 60 }),
    );
  });

  it('sin limit/offset no envía take/skip (comportamiento previo, sin límite)', async () => {
    const { servicio, habitanteRepository } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3 });

    expect(habitanteRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ take: undefined, skip: undefined }),
    );
  });

  it('filtra por numeroDocumento como prefijo (Like) y por tipoDocumentoId exacto', async () => {
    const { servicio, habitanteRepository } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, tipoDocumentoId: 5, numeroDocumento: '123' });

    const llamada = habitanteRepository.find.mock.calls[0][0];
    expect(llamada.where.tipoDocumentoId).toBe(5);
    expect(llamada.where.numeroDocumento).toEqual(Like('123%'));
  });
});

describe('HabitanteService.actualizar — reasignación de hogar', () => {
  const habitanteExistente = {
    id: 1,
    uuid: 'habitante-uuid',
    hogarId: 10,
    comunidadId: 3,
    periodoCensalId: 1,
    nombres: 'Ana',
    apellidos: 'Perez',
  };

  function crearManagerFake(
    parentescoExistente: Record<string, unknown> | null,
    hogarOrigen: Record<string, unknown>,
  ) {
    const guardados: Array<{ entidad: { name: string }; datos: Record<string, unknown> }> = [];
    return {
      guardados,
      findOneOrFail: jest.fn().mockResolvedValue(hogarOrigen),
      findOne: jest.fn().mockResolvedValue(parentescoExistente),
      create: jest.fn((_entidad: unknown, datos: Record<string, unknown>) => ({ ...datos })),
      save: jest.fn(async (entidad: { name: string }, datos: Record<string, unknown>) => {
        guardados.push({ entidad, datos });
        return datos;
      }),
    };
  }

  function crearServicio(
    opciones: {
      hogarDestino?: Record<string, unknown>;
      hogarOrigen?: Record<string, unknown>;
      parentescoItem?: Record<string, unknown> | null;
      parentescoExistente?: Record<string, unknown> | null;
    } = {},
  ) {
    const hogarDestino = opciones.hogarDestino ?? { id: 20, comunidadId: 3, estado: EstadoHogar.ACTIVO, jefeHogarId: null };
    const hogarOrigen = opciones.hogarOrigen ?? { id: 10, comunidadId: 3, jefeHogarId: null };
    const manager = crearManagerFake(
      opciones.parentescoExistente !== undefined ? opciones.parentescoExistente : null,
      hogarOrigen,
    );

    const habitanteRepository = { findOne: jest.fn().mockResolvedValue({ ...habitanteExistente }) };
    const catalogoItemRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue(opciones.parentescoItem !== undefined ? opciones.parentescoItem : { id: 66, codigo: 'hijo' }),
    };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const hogarService = { obtener: jest.fn().mockResolvedValue(hogarDestino) };
    const periodoCensalService = { assertAbierto: jest.fn().mockResolvedValue(undefined) };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      catalogoItemRepository as never,
      dataSource as never,
      hogarService as never,
      periodoCensalService as never,
    );

    return { servicio, manager, hogarDestino, hogarOrigen };
  }

  it('reasigna el habitante a un hogar activo de la misma comunidad y versiona el parentesco con el hogarId del destino', async () => {
    const { servicio, manager, hogarDestino } = crearServicio({
      parentescoExistente: { id: 5, catalogoItemId: 1, hogarId: 10, version: 1 },
    });

    const resultado = await servicio.actualizar(1, { hogarId: 20, parentescoCatalogoItemId: 66 }, crearUsuario());

    expect(resultado.hogarId).toBe(hogarDestino['id']);
    const parentescoGuardado = manager.guardados.find((g) => g.entidad.name === 'HabitanteParentesco');
    expect((parentescoGuardado?.datos as { hogarId?: number }).hogarId).toBe(20);
    expect((parentescoGuardado?.datos as { catalogoItemId?: number }).catalogoItemId).toBe(66);
    expect((parentescoGuardado?.datos as { version?: number }).version).toBe(2);
  });

  it('rechaza si el hogar destino pertenece a otra comunidad', async () => {
    const { servicio } = crearServicio({
      hogarDestino: { id: 20, comunidadId: 99, estado: EstadoHogar.ACTIVO, jefeHogarId: null },
    });

    await expect(servicio.actualizar(1, { hogarId: 20, parentescoCatalogoItemId: 66 }, crearUsuario())).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza si el hogar destino no está activo', async () => {
    const { servicio } = crearServicio({
      hogarDestino: { id: 20, comunidadId: 3, estado: EstadoHogar.INACTIVO, jefeHogarId: null },
    });

    await expect(servicio.actualizar(1, { hogarId: 20, parentescoCatalogoItemId: 66 }, crearUsuario())).rejects.toThrow(
      ConflictException,
    );
  });

  it('si el habitante era jefe del hogar de origen, ese hogar queda sin jefe tras la reasignación (no se bloquea)', async () => {
    const { servicio, manager } = crearServicio({ hogarOrigen: { id: 10, comunidadId: 3, jefeHogarId: 1 } });

    await servicio.actualizar(1, { hogarId: 20, parentescoCatalogoItemId: 66 }, crearUsuario());

    const hogarOrigenGuardado = manager.guardados.find(
      (g) => g.entidad.name === 'Hogar' && (g.datos as { id?: number }).id === 10,
    );
    expect((hogarOrigenGuardado?.datos as { jefeHogarId?: number | null }).jefeHogarId).toBeNull();
  });

  it('si el nuevo parentesco es "jefe_hogar", el hogar destino queda con jefeHogarId = habitante reasignado', async () => {
    const { servicio, manager } = crearServicio({ parentescoItem: { id: 66, codigo: 'jefe_hogar' } });

    await servicio.actualizar(1, { hogarId: 20, parentescoCatalogoItemId: 66 }, crearUsuario());

    const hogarDestinoGuardado = manager.guardados.find(
      (g) => g.entidad.name === 'Hogar' && (g.datos as { id?: number }).id === 20,
    );
    expect((hogarDestinoGuardado?.datos as { jefeHogarId?: number }).jefeHogarId).toBe(1);
  });

  it('rechaza con BadRequestException si falta parentescoCatalogoItemId al reasignar', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.actualizar(1, { hogarId: 20 }, crearUsuario())).rejects.toThrow(BadRequestException);
  });

  it('la edición simple sin hogarId sigue funcionando igual que antes (regresión)', async () => {
    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValue({ ...habitanteExistente }),
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

    const resultado = await servicio.actualizar(1, { nombres: 'Ana María' }, crearUsuario());

    expect(resultado.nombres).toBe('Ana María');
    expect(resultado.hogarId).toBe(10);
  });
});

describe('HabitanteService.obtenerNucleoFamiliar', () => {
  it('arma el organigrama: jefe de hogar marcado, y el parentesco más reciente por habitante (Fase 11)', async () => {
    const hogar = { id: 10, jefeHogarId: 101 };
    const habitantes = [
      { id: 101, nombres: 'Ana', apellidos: 'Perez', estado: EstadoHabitante.ACTIVO },
      { id: 102, nombres: 'Luis', apellidos: 'Perez', estado: EstadoHabitante.ACTIVO },
    ];
    // El repositorio real ordena DESC por periodoCensalId; el fake ignora la opción de orden,
    // así que el array ya viene pre-ordenado como lo haría la consulta real.
    const parentescos = [
      { habitanteId: 102, periodoCensalId: 2, catalogoItem: { codigo: 'nieto', nombre: 'Nieto/a' } },
      { habitanteId: 102, periodoCensalId: 1, catalogoItem: { codigo: 'hijo', nombre: 'Hijo/a' } },
    ];
    const habitanteRepository = { find: jest.fn().mockResolvedValue(habitantes) };
    const parentescoRepository = { find: jest.fn().mockResolvedValue(parentescos) };
    const hogarService = { obtener: jest.fn().mockResolvedValue(hogar) };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      parentescoRepository as never,
      {} as never,
      {} as never,
      hogarService as never,
      {} as never,
    );

    const resultado = await servicio.obtenerNucleoFamiliar(10, crearUsuario());

    expect(resultado.miembros).toEqual([
      {
        habitanteId: 101,
        nombres: 'Ana',
        apellidos: 'Perez',
        estado: EstadoHabitante.ACTIVO,
        esJefeHogar: true,
        parentescoCodigo: null,
        parentescoNombre: null,
      },
      {
        habitanteId: 102,
        nombres: 'Luis',
        apellidos: 'Perez',
        estado: EstadoHabitante.ACTIVO,
        esJefeHogar: false,
        parentescoCodigo: 'nieto',
        parentescoNombre: 'Nieto/a',
      },
    ]);
  });

  it('retorna miembros vacíos si el hogar no tiene habitantes', async () => {
    const habitanteRepository = { find: jest.fn().mockResolvedValue([]) };
    const hogarService = { obtener: jest.fn().mockResolvedValue({ id: 11, jefeHogarId: null }) };
    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      {} as never,
      hogarService as never,
      {} as never,
    );

    const resultado = await servicio.obtenerNucleoFamiliar(11, crearUsuario());

    expect(resultado).toEqual({ hogarId: 11, miembros: [] });
  });
});

describe('HabitanteService.obtenerNucleoFamiliarPropio (Fase 14, autogestión)', () => {
  it('resuelve el hogar desde el propio habitante autenticado, ignorando cualquier otro hogarId', async () => {
    const habitanteAutenticado = { id: 101, hogarId: 10 };
    const hogar = { id: 10, jefeHogarId: 101 };
    const habitantes = [{ id: 101, nombres: 'Ana', apellidos: 'Perez', estado: EstadoHabitante.ACTIVO }];

    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValue(habitanteAutenticado),
      find: jest.fn().mockResolvedValue(habitantes),
    };
    const parentescoRepository = { find: jest.fn().mockResolvedValue([]) };
    // `hogarService.obtener` solo recibe el `hogarId` del propio habitante — nunca un
    // segundo argumento `usuario`, ni ningún hogarId provisto por el llamador de la prueba.
    const hogarService = { obtener: jest.fn().mockResolvedValue(hogar) };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      parentescoRepository as never,
      {} as never,
      {} as never,
      hogarService as never,
      {} as never,
    );

    const resultado = await servicio.obtenerNucleoFamiliarPropio(101);

    expect(hogarService.obtener).toHaveBeenCalledWith(10);
    expect(resultado.hogarId).toBe(10);
    expect(resultado.miembros[0]).toEqual(
      expect.objectContaining({ habitanteId: 101, esJefeHogar: true }),
    );
  });
});

describe('HabitanteService.actualizarContactoPropio (Fase 14, autogestión)', () => {
  it('actualiza solo telefono/correoElectronico, sin exigir periodo abierto', async () => {
    const habitante = { id: 101, telefono: null, correoElectronico: null };
    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValue(habitante),
      save: jest.fn((valor) => valor),
    };
    const periodoCensalService = { assertAbierto: jest.fn() };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      periodoCensalService as never,
    );

    const resultado = await servicio.actualizarContactoPropio(101, {
      telefono: '3001234567',
      correoElectronico: 'ana@correo.test',
    });

    expect(resultado).toEqual(
      expect.objectContaining({ telefono: '3001234567', correoElectronico: 'ana@correo.test' }),
    );
    expect(periodoCensalService.assertAbierto).not.toHaveBeenCalled();
  });

  it('no toca un campo omitido en el DTO', async () => {
    const habitante = { id: 101, telefono: '3000000000', correoElectronico: 'previo@correo.test' };
    const habitanteRepository = {
      findOne: jest.fn().mockResolvedValue(habitante),
      save: jest.fn((valor) => valor),
    };

    const servicio = new HabitanteService(
      habitanteRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const resultado = await servicio.actualizarContactoPropio(101, { telefono: '3001111111' });

    expect(resultado).toEqual(
      expect.objectContaining({ telefono: '3001111111', correoElectronico: 'previo@correo.test' }),
    );
  });
});

// Referencia cruzada de RF-01-05 usada por el servicio (no se reimplementa el algoritmo aquí, ver similitud-duplicados.spec.ts).
describe('DecisionRevisionDuplicado', () => {
  it('solo define el valor confirmado_no_duplicado por ahora', () => {
    expect(DecisionRevisionDuplicado.CONFIRMADO_NO_DUPLICADO).toBe('confirmado_no_duplicado');
  });
});
