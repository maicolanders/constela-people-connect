import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CrearHabitanteEducacionDto } from '../dto/crear-habitante-educacion.dto';
import { EducacionService } from './educacion.service';

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

const dtoBase: CrearHabitanteEducacionDto = {
  alfabetizado: true,
  nivelEducativoCatalogoItemId: 5,
  asisteEscuela: false,
  lenguas: [{ lenguaCatalogoItemId: 10, esLenguaMaterna: true }],
};

describe('EducacionService.crearParaHabitante', () => {
  function crearServicio(opciones: { existente?: unknown; manager?: ReturnType<typeof crearManagerFake> } = {}) {
    const manager = opciones.manager ?? crearManagerFake();
    const educacionRepository = { findOne: jest.fn().mockResolvedValue(opciones.existente ?? null), save: jest.fn() };
    const lenguaRepository = { find: jest.fn() };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const habitanteService = { obtener: jest.fn().mockResolvedValue({ id: 10, comunidadId: 3 }) };

    const servicio = new EducacionService(
      educacionRepository as never,
      lenguaRepository as never,
      dataSource as never,
      habitanteService as never,
    );

    return { servicio, manager, habitanteService, educacionRepository };
  }

  it('verifica acceso al habitante antes de crear', async () => {
    const { servicio, habitanteService } = crearServicio();

    await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(habitanteService.obtener).toHaveBeenCalledWith(10, crearUsuario());
  });

  it('crea el registro de educación + lenguas en una transacción', async () => {
    const { servicio, manager } = crearServicio();

    const educacion = await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(manager.guardados).toHaveLength(2);
    expect(educacion).toEqual(expect.objectContaining({ habitanteId: 10, alfabetizado: true }));
  });

  it('rechaza si el habitante ya tiene un registro de educación', async () => {
    const { servicio } = crearServicio({ existente: { id: 1, habitanteId: 10 } });

    await expect(servicio.crearParaHabitante(10, dtoBase, crearUsuario())).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('EducacionService.reemplazarLenguas', () => {
  it('borra las lenguas existentes e inserta las nuevas', async () => {
    const manager = crearManagerFake();
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const servicio = new EducacionService({} as never, {} as never, dataSource as never, {} as never);

    const resultado = await servicio.reemplazarLenguas(10, [{ lenguaCatalogoItemId: 20, esLenguaMaterna: false }]);

    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), { habitanteId: 10 });
    expect(resultado).toEqual([expect.objectContaining({ habitanteId: 10, lenguaCatalogoItemId: 20 })]);
  });
});
