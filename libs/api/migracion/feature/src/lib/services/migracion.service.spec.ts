import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DireccionMigratoria, RolCodigo, TipoMovimientoMigratorio } from '@censo/shared-data-access';
import { CrearMovimientoMigratorioDto } from '../dto/crear-movimiento-migratorio.dto';
import { MigracionService } from './migracion.service';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

const dtoBase: CrearMovimientoMigratorioDto = {
  periodoCensalId: 1,
  tipoMovimiento: TipoMovimientoMigratorio.INTERNA,
  direccion: DireccionMigratoria.SALIDA,
  destinoDescripcionLibre: 'Bogotá',
  fechaMovimiento: '2026-05-01',
  motivoCatalogoItemId: 10,
  esTemporal: true,
};

function crearServicio() {
  let siguienteId = 1;
  const movimientoRepository = {
    create: jest.fn((datos: Record<string, unknown>) => ({ ...datos })),
    save: jest.fn(async (datos: Record<string, unknown>) => ({ id: siguienteId++, ...datos })),
    find: jest.fn(),
    findOne: jest.fn(),
    softRemove: jest.fn(),
  };
  const habitanteService = { obtener: jest.fn().mockResolvedValue({ id: 10, comunidadId: 3 }) };

  const servicio = new MigracionService(movimientoRepository as never, habitanteService as never);
  return { servicio, movimientoRepository, habitanteService };
}

describe('MigracionService.crearParaHabitante', () => {
  it('verifica acceso al habitante antes de crear', async () => {
    const { servicio, habitanteService } = crearServicio();

    await servicio.crearParaHabitante(10, dtoBase, crearUsuario());

    expect(habitanteService.obtener).toHaveBeenCalledWith(10, crearUsuario());
  });

  it('crea el evento migratorio (siempre agrega, no rechaza duplicado)', async () => {
    const { servicio, movimientoRepository } = crearServicio();

    const primero = await servicio.crearParaHabitante(10, dtoBase, crearUsuario());
    const segundo = await servicio.crearParaHabitante(10, { ...dtoBase, direccion: DireccionMigratoria.ENTRADA }, crearUsuario());

    expect(primero.id).not.toBe(segundo.id);
    expect(movimientoRepository.save).toHaveBeenCalledTimes(2);
  });
});

describe('MigracionService.listarPorHabitante', () => {
  it('verifica acceso y lista los eventos ordenados por fecha descendente', async () => {
    const { servicio, movimientoRepository, habitanteService } = crearServicio();
    movimientoRepository.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    const resultado = await servicio.listarPorHabitante(10, crearUsuario());

    expect(habitanteService.obtener).toHaveBeenCalledWith(10, crearUsuario());
    expect(movimientoRepository.find).toHaveBeenCalledWith({ where: { habitanteId: 10 }, order: { fechaMovimiento: 'DESC' } });
    expect(resultado).toEqual([{ id: 1 }, { id: 2 }]);
  });
});
