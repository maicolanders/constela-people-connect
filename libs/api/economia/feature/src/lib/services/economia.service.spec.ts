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

  it('rechaza si el habitante ya tiene un registro de ocupación', async () => {
    const { servicio } = crearServicio({ existente: { id: 1, habitanteId: 10 } });

    await expect(servicio.crearParaHabitante(10, dtoBase, crearUsuario())).rejects.toBeInstanceOf(ForbiddenException);
  });
});
