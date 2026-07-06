import { ForbiddenException } from '@nestjs/common';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { PeriodoCensalService } from './periodo-censal.service';

function crearServicio(periodoExistente: { id: number; estado: EstadoPeriodo }) {
  const periodoRepository = {
    findOne: jest.fn().mockResolvedValue({ ...periodoExistente }),
    save: jest.fn(async (periodo: unknown) => periodo),
  };
  const auditoriaRepository = { save: jest.fn(), create: jest.fn() };
  const periodoCierreHookRegistry = { ejecutarTodos: jest.fn().mockResolvedValue(undefined) };

  const servicio = new PeriodoCensalService(
    periodoRepository as never,
    auditoriaRepository as never,
    periodoCierreHookRegistry as never,
  );

  return { servicio, periodoRepository, periodoCierreHookRegistry };
}

describe('PeriodoCensalService.cerrar', () => {
  it('cierra un periodo abierto e invoca PeriodoCierreHookRegistry (RF-02-03: recalcular al cerrar)', async () => {
    const { servicio, periodoCierreHookRegistry } = crearServicio({ id: 7, estado: EstadoPeriodo.ABIERTO });

    const resultado = await servicio.cerrar(7);

    expect(resultado.estado).toBe(EstadoPeriodo.CERRADO);
    expect(periodoCierreHookRegistry.ejecutarTodos).toHaveBeenCalledWith(7);
    expect(periodoCierreHookRegistry.ejecutarTodos).toHaveBeenCalledTimes(1);
  });

  it('rechaza cerrar un periodo que no está abierto y no invoca el registro', async () => {
    const { servicio, periodoCierreHookRegistry } = crearServicio({ id: 8, estado: EstadoPeriodo.PLANEADO });

    await expect(servicio.cerrar(8)).rejects.toThrow(ForbiddenException);
    expect(periodoCierreHookRegistry.ejecutarTodos).not.toHaveBeenCalled();
  });
});
