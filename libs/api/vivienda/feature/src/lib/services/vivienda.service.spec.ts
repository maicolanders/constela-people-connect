import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHogar, EstadoServicio, RolCodigo } from '@censo/shared-data-access';
import { CrearViviendaDto } from '../dto/crear-vivienda.dto';
import { ViviendaService } from './vivienda.service';

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
  };
}

const dtoBase: CrearViviendaDto = {
  tipoViviendaCatalogoItemId: 1,
  materialParedCatalogoItemId: 2,
  materialPisoCatalogoItemId: 3,
  materialTechoCatalogoItemId: 4,
  numeroDormitorios: 2,
  servicios: [{ tipoServicioCatalogoItemId: 10, estado: EstadoServicio.SI, fuenteCatalogoItemId: 20 }],
};

describe('ViviendaService.crearParaHogar', () => {
  const hogarSinVivienda = { id: 10, comunidadId: 3, periodoCensalId: 1, viviendaId: null, estado: EstadoHogar.ACTIVO };
  const hogarConVivienda = { ...hogarSinVivienda, viviendaId: 77 };

  function crearServicio(opciones: { hogar?: unknown; manager?: ReturnType<typeof crearManagerFake> } = {}) {
    const manager = opciones.manager ?? crearManagerFake();
    const viviendaRepository = { findOne: jest.fn() };
    const servicioRepository = { find: jest.fn() };
    const dataSource = { transaction: jest.fn((cb: (m: unknown) => Promise<unknown>) => cb(manager)) };
    const hogarService = {
      obtener: jest.fn().mockResolvedValue(opciones.hogar ?? hogarSinVivienda),
      asignarVivienda: jest.fn().mockResolvedValue(undefined),
    };
    const periodoCensalService = { assertAbierto: jest.fn().mockResolvedValue(undefined) };

    const servicio = new ViviendaService(
      viviendaRepository as never,
      servicioRepository as never,
      dataSource as never,
      hogarService as never,
      periodoCensalService as never,
    );

    return { servicio, manager, hogarService, periodoCensalService };
  }

  it('crea la vivienda + servicios en una transacción y asigna hogares.vivienda_id', async () => {
    const { servicio, manager, hogarService } = crearServicio();

    const vivienda = await servicio.crearParaHogar(10, dtoBase, crearUsuario());

    expect(manager.guardados).toHaveLength(2);
    expect(vivienda).toEqual(expect.objectContaining({ comunidadId: 3, numeroDormitorios: 2 }));
    expect(hogarService.asignarVivienda).toHaveBeenCalledWith(10, vivienda.id);
  });

  it('verifica que el periodo del hogar esté abierto antes de crear', async () => {
    const { servicio, periodoCensalService } = crearServicio();

    await servicio.crearParaHogar(10, dtoBase, crearUsuario());

    expect(periodoCensalService.assertAbierto).toHaveBeenCalledWith(1);
  });

  it('rechaza si el hogar ya tiene una vivienda registrada', async () => {
    const { servicio } = crearServicio({ hogar: hogarConVivienda });

    await expect(servicio.crearParaHogar(10, dtoBase, crearUsuario())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
