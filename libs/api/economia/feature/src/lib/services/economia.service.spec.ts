import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CrearHabitanteOcupacionDto } from '../dto/crear-habitante-ocupacion.dto';
import { EconomiaService } from './economia.service';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

const dtoBase: CrearHabitanteOcupacionDto = {
  condicionActividadCatalogoItemId: 1,
  ocupacionCatalogoItemId: 5,
  ingresoMensual: 850000,
};

describe('EconomiaService.crearParaHabitante', () => {
  function crearServicio(opciones: { existente?: unknown } = {}) {
    const ocupacionRepository = {
      findOne: jest.fn().mockResolvedValue(opciones.existente ?? null),
      create: jest.fn((datos: Record<string, unknown>) => ({ ...datos })),
      save: jest.fn(async (datos: Record<string, unknown>) => ({ id: 1, ...datos })),
    };
    const habitanteService = { obtener: jest.fn().mockResolvedValue({ id: 10, comunidadId: 3 }) };

    const servicio = new EconomiaService(ocupacionRepository as never, habitanteService as never);
    return { servicio, ocupacionRepository, habitanteService };
  }

  it('verifica acceso al habitante antes de crear', async () => {
    const { servicio, habitanteService } = crearServicio();

    await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(habitanteService.obtener).toHaveBeenCalledWith(10, crearUsuario());
  });

  it('crea el registro de ocupación con el ingreso mensual serializado como string (columna numeric)', async () => {
    const { servicio, ocupacionRepository } = crearServicio();

    const ocupacion = await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(ocupacionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ habitanteId: 10, condicionActividadCatalogoItemId: 1, ingresoMensual: '850000' }),
    );
    expect(ocupacion).toEqual(expect.objectContaining({ habitanteId: 10 }));
  });

  it('guarda ingresoMensual null como null real, no como el string "null" (bug de sync offline)', async () => {
    const { servicio, ocupacionRepository } = crearServicio();

    await servicio.crearParaHabitante(10, { ...dtoBase, ingresoMensual: null as never }, crearUsuario());

    expect(ocupacionRepository.save).toHaveBeenCalledWith(expect.objectContaining({ ingresoMensual: null }));
  });

  it('rechaza si el habitante ya tiene un registro de ocupación', async () => {
    const { servicio } = crearServicio({ existente: { id: 1, habitanteId: 10 } });

    await expect(servicio.crearParaHabitante(10, dtoBase, crearUsuario())).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('EconomiaService.actualizar', () => {
  function crearServicio(ingresoMensualExistente: string | null) {
    const existente = { id: 1, habitanteId: 10, ingresoMensual: ingresoMensualExistente };
    const ocupacionRepository = {
      findOne: jest.fn().mockResolvedValue(existente),
      save: jest.fn(async (datos: Record<string, unknown>) => datos),
    };
    const habitanteService = { obtener: jest.fn() };
    const servicio = new EconomiaService(ocupacionRepository as never, habitanteService as never);
    return { servicio, ocupacionRepository };
  }

  it('null explícito limpia el ingreso (no lo serializa como el string "null")', async () => {
    const { servicio, ocupacionRepository } = crearServicio('850000');

    await servicio.actualizar(1, { ingresoMensual: null as never });

    expect(ocupacionRepository.save).toHaveBeenCalledWith(expect.objectContaining({ ingresoMensual: null }));
  });

  it('omitir el campo conserva el ingreso existente', async () => {
    const { servicio, ocupacionRepository } = crearServicio('850000');

    await servicio.actualizar(1, { condicionActividadCatalogoItemId: 2 });

    expect(ocupacionRepository.save).toHaveBeenCalledWith(expect.objectContaining({ ingresoMensual: '850000' }));
  });

  it('un número nuevo actualiza el ingreso serializado', async () => {
    const { servicio, ocupacionRepository } = crearServicio('850000');

    await servicio.actualizar(1, { ingresoMensual: 900000 });

    expect(ocupacionRepository.save).toHaveBeenCalledWith(expect.objectContaining({ ingresoMensual: '900000' }));
  });
});
