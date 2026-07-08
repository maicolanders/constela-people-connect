import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CrearHabitanteEtniaDto } from '../dto/crear-habitante-etnia.dto';
import { EtniaVulnerabilidadService } from './etnia-vulnerabilidad.service';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

function crearManagerFake() {
  let siguienteId = 500;
  const guardados: unknown[] = [];
  return {
    guardados,
    create: jest.fn((_entidad: unknown, datos: Record<string, unknown>) => ({ ...datos })),
    save: jest.fn(async (datos: Record<string, unknown>) => {
      const guardado = { id: (datos['id'] as number | undefined) ?? siguienteId++, ...datos };
      guardados.push(guardado);
      return guardado;
    }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

const dtoBase: CrearHabitanteEtniaDto = {
  etniaCatalogoItemId: 5,
  lenguaMaternaCatalogoItemId: 8,
  condicionesVulnerabilidad: [{ condicionVulnerabilidadCatalogoItemId: 10 }, { condicionVulnerabilidadCatalogoItemId: 11 }],
};

describe('EtniaVulnerabilidadService.crearParaHabitante', () => {
  function crearServicio(opciones: { existente?: unknown; manager?: ReturnType<typeof crearManagerFake> } = {}) {
    const manager = opciones.manager ?? crearManagerFake();
    const etniaRepository = { findOne: jest.fn().mockResolvedValue(opciones.existente ?? null), save: jest.fn() };
    const condicionRepository = { find: jest.fn() };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const habitanteService = { obtener: jest.fn().mockResolvedValue({ id: 10, comunidadId: 3 }) };

    const servicio = new EtniaVulnerabilidadService(
      etniaRepository as never,
      condicionRepository as never,
      dataSource as never,
      habitanteService as never,
    );

    return { servicio, manager, habitanteService, etniaRepository };
  }

  it('verifica acceso al habitante antes de crear', async () => {
    const { servicio, habitanteService } = crearServicio();

    await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(habitanteService.obtener).toHaveBeenCalledWith(10, crearUsuario());
  });

  it('crea el registro de etnia + condiciones de vulnerabilidad en una transacción', async () => {
    const { servicio, manager } = crearServicio();

    const etnia = await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(manager.guardados).toHaveLength(3);
    expect(etnia).toEqual(expect.objectContaining({ habitanteId: 10, etniaCatalogoItemId: 5 }));
  });

  it('deduplica códigos de condición de vulnerabilidad repetidos en el payload', async () => {
    const { servicio, manager } = crearServicio();

    await servicio.crearParaHabitante(
      10,
      { ...dtoBase, condicionesVulnerabilidad: [{ condicionVulnerabilidadCatalogoItemId: 10 }, { condicionVulnerabilidadCatalogoItemId: 10 }] },
      crearUsuario(),
    );

    expect(manager.guardados).toHaveLength(2);
  });

  it('rechaza si el habitante ya tiene un registro de identificación étnica', async () => {
    const { servicio } = crearServicio({ existente: { id: 1, habitanteId: 10 } });

    await expect(servicio.crearParaHabitante(10, dtoBase, crearUsuario())).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('EtniaVulnerabilidadService.reemplazarCondiciones', () => {
  it('borra las condiciones existentes e inserta las nuevas, deduplicadas', async () => {
    const manager = crearManagerFake();
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const servicio = new EtniaVulnerabilidadService({} as never, {} as never, dataSource as never, {} as never);

    const resultado = await servicio.reemplazarCondiciones(10, [
      { condicionVulnerabilidadCatalogoItemId: 20 },
      { condicionVulnerabilidadCatalogoItemId: 20 },
      { condicionVulnerabilidadCatalogoItemId: 21 },
    ]);

    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { habitanteId: 10 });
    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ habitanteId: 10, condicionVulnerabilidadCatalogoItemId: 20 }),
        expect.objectContaining({ habitanteId: 10, condicionVulnerabilidadCatalogoItemId: 21 }),
      ]),
    );
  });
});
