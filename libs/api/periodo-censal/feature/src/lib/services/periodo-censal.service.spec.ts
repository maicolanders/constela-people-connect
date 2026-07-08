import { ForbiddenException } from '@nestjs/common';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { PeriodoCensalService } from './periodo-censal.service';

interface PeriodoFalso {
  id: number;
  estado: EstadoPeriodo;
  periodoOrigenId?: number | null;
}

/** Repositorio falso con estado real (map por id): `abrir()` necesita releer lo que `crear()` acaba de guardar. */
function crearServicio(periodoExistente: PeriodoFalso) {
  const periodos = new Map<number, PeriodoFalso>([[periodoExistente.id, { ...periodoExistente }]]);
  let siguienteId = 1000;

  const periodoRepository = {
    findOne: jest.fn(async ({ where: { id } }: { where: { id: number } }) => periodos.get(id) ?? null),
    create: jest.fn((datos: Partial<PeriodoFalso>) => ({ ...datos }) as PeriodoFalso),
    save: jest.fn(async (periodo: PeriodoFalso) => {
      const guardado = { ...periodo, id: periodo.id ?? ++siguienteId };
      periodos.set(guardado.id, guardado);
      return guardado;
    }),
  };
  const auditoriaRepository = { save: jest.fn(), create: jest.fn() };
  const periodoCierreHookRegistry = { ejecutarTodos: jest.fn().mockResolvedValue(undefined) };
  const dataSource = { query: jest.fn().mockResolvedValue(undefined) };

  const servicio = new PeriodoCensalService(
    periodoRepository as never,
    auditoriaRepository as never,
    periodoCierreHookRegistry as never,
    dataSource as never,
  );

  return { servicio, periodoRepository, periodoCierreHookRegistry, dataSource };
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

describe('PeriodoCensalService.iniciarNuevoPeriodo', () => {
  const dtoNuevoPeriodo = { nombre: 'Censo 2027', codigo: 'censo-2027', fechaInicio: '2027-01-01' };

  it('crea y abre el nuevo periodo, encadenado al origen, y copia hacia adelante la base poblacional activa (RF-10-01)', async () => {
    const { servicio, dataSource } = crearServicio({ id: 7, estado: EstadoPeriodo.CERRADO });

    const nuevo = await servicio.iniciarNuevoPeriodo(7, dtoNuevoPeriodo);

    expect(nuevo.estado).toBe(EstadoPeriodo.ABIERTO);
    expect(nuevo.periodoOrigenId).toBe(7);
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE hogares'), [7, nuevo.id]);
    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE habitantes'), [7, nuevo.id]);
  });

  it('rechaza partir de un periodo que no está cerrado', async () => {
    const { servicio, dataSource } = crearServicio({ id: 9, estado: EstadoPeriodo.ABIERTO });

    await expect(servicio.iniciarNuevoPeriodo(9, dtoNuevoPeriodo)).rejects.toThrow(ForbiddenException);
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
