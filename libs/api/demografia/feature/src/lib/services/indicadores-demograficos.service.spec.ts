import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoPeriodo, RolCodigo } from '@censo/shared-data-access';
import { IndicadoresDemograficosService } from './indicadores-demograficos.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return {
    id: 1,
    email: 'analista@censo.test',
    roles: [RolCodigo.ANALISTA],
    asignaciones: [{ rol: RolCodigo.ANALISTA, comunidadId }],
  };
}

describe('IndicadoresDemograficosService', () => {
  function crearServicio(opciones: {
    periodo?: { estado: EstadoPeriodo };
    fila?: Record<string, number> | null;
  }) {
    const vistaRepository = { findOne: jest.fn().mockResolvedValue(opciones.fila ?? null) };
    const dataSource = { query: jest.fn().mockResolvedValue(undefined) };
    const periodoCensalService = {
      obtener: jest.fn().mockResolvedValue({ id: 1, estado: opciones.periodo?.estado ?? EstadoPeriodo.CERRADO }),
    };
    const periodoCierreHookRegistry = { registrar: jest.fn() };

    const servicio = new IndicadoresDemograficosService(
      vistaRepository as never,
      dataSource as never,
      periodoCensalService as never,
      periodoCierreHookRegistry as never,
    );

    return { servicio, vistaRepository, dataSource, periodoCierreHookRegistry };
  }

  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio({});

    await expect(
      servicio.obtener(crearUsuario(9), { comunidadId: 3, periodoCensalId: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('RF-02-03: no disponible si el periodo no está cerrado ("se recalculan al cerrar")', async () => {
    const { servicio } = crearServicio({ periodo: { estado: EstadoPeriodo.ABIERTO } });

    await expect(
      servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('calcula las 4 métricas a partir de la vista cuando el periodo está cerrado', async () => {
    const { servicio } = crearServicio({
      fila: { poblacionTotal: 100, poblacion0a14: 20, poblacion65Mas: 10, poblacion15a64: 70, altasPeriodo: 5, defuncionesPeriodo: 2 },
    });

    const resultado = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    expect(resultado.suprimido).toBe(false);
    expect(resultado.poblacionTotal).toBe(100);
    expect(resultado.razonDependencia).toBeCloseTo(((20 + 10) / 70) * 100, 5);
    expect(resultado.indiceEnvejecimiento).toBeCloseTo((10 / 20) * 100, 5);
    expect(resultado.tasaNatalidadAparente).toBeCloseTo((5 / 100) * 1000, 5);
    expect(resultado.tasaMortalidadAparente).toBeCloseTo((2 / 100) * 1000, 5);
  });

  it('responde sin error (población 0) cuando el periodo cerró pero no hay fila en la vista todavía', async () => {
    const { servicio } = crearServicio({ fila: null });

    const resultado = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    expect(resultado.poblacionTotal).toBe(0);
    expect(resultado.suprimido).toBe(false);
    expect(resultado.razonDependencia).toBeNull();
  });

  it('suprime (k-anonimity) si la población total es menor al umbral', async () => {
    const { servicio } = crearServicio({
      fila: { poblacionTotal: 3, poblacion0a14: 1, poblacion65Mas: 0, poblacion15a64: 2, altasPeriodo: 1, defuncionesPeriodo: 0 },
    });

    const resultado = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    expect(resultado.suprimido).toBe(true);
    expect(resultado.poblacionTotal).toBeNull();
  });

  it('no lanza error si un denominador es 0: el indicador queda null (no aplicable)', async () => {
    const { servicio } = crearServicio({
      fila: { poblacionTotal: 50, poblacion0a14: 0, poblacion65Mas: 5, poblacion15a64: 45, altasPeriodo: 1, defuncionesPeriodo: 0 },
    });

    const resultado = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    expect(resultado.indiceEnvejecimiento).toBeNull(); // divide por poblacion0a14 = 0
    expect(resultado.razonDependencia).not.toBeNull();
  });

  it('se registra en PeriodoCierreHookRegistry al inicializar el módulo', () => {
    const { servicio, periodoCierreHookRegistry } = crearServicio({});

    servicio.onModuleInit();

    expect(periodoCierreHookRegistry.registrar).toHaveBeenCalledWith(servicio);
  });

  it('alCerrarPeriodo refresca la vista materializada', async () => {
    const { servicio, dataSource } = crearServicio({});

    await servicio.alCerrarPeriodo();

    expect(dataSource.query).toHaveBeenCalledWith('REFRESH MATERIALIZED VIEW mv_indicadores_demograficos_periodo');
  });
});
