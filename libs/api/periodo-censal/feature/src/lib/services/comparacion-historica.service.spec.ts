import { ComparacionHistoricaService } from './comparacion-historica.service';

const PERIODOS = [
  { id: 1, nombre: 'Censo 2020' },
  { id: 2, nombre: 'Censo 2026' },
];

function crearServicio(
  filasPoblacion: unknown[],
  filasCobertura: unknown[],
  comunidades: unknown[] = [{ id: 4, nombre: 'Guambiano' }],
) {
  const periodoRepository = { find: jest.fn().mockResolvedValue(PERIODOS) };
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM comunidades')) return comunidades;
      if (sql.includes('FROM mv_indicadores_demograficos_periodo')) return filasPoblacion;
      if (sql.includes('FROM hogares h')) return filasCobertura;
      return [];
    }),
  };

  const servicio = new ComparacionHistoricaService(periodoRepository as never, dataSource as never);
  return { servicio, periodoRepository, dataSource };
}

function usuarioGlobal() {
  return { id: 1, email: 'a@a.com', roles: [], asignaciones: [{ rol: 'administrador', comunidadId: null }] } as never;
}

describe('ComparacionHistoricaService.comparar', () => {
  it('arma una serie por comunidad con población (vista) y cobertura de servicios (en vivo) por periodo', async () => {
    const { servicio } = crearServicio(
      [
        { comunidad_id: 4, periodo_censal_id: 1, poblacion_total: '40' },
        { comunidad_id: 4, periodo_censal_id: 2, poblacion_total: '55' },
      ],
      [
        { comunidad_id: 4, periodo_censal_id: 1, con_acceso: '5', total: '10' },
        { comunidad_id: 4, periodo_censal_id: 2, con_acceso: '8', total: '10' },
      ],
    );

    const [resultado] = await servicio.comparar(usuarioGlobal(), { periodoCensalIds: [1, 2] });

    expect(resultado.comunidadNombre).toBe('Guambiano');
    expect(resultado.puntos).toEqual([
      { periodoCensalId: 1, periodoNombre: 'Censo 2020', poblacionTotal: 40, coberturaServiciosPromedio: 50, suprimido: false },
      { periodoCensalId: 2, periodoNombre: 'Censo 2026', poblacionTotal: 55, coberturaServiciosPromedio: 80, suprimido: false },
    ]);
  });

  it('reporta poblacionTotal null (sin dato) cuando el periodo no tiene snapshot en la vista, sin marcarlo como suprimido', async () => {
    const { servicio } = crearServicio([], []);

    const [resultado] = await servicio.comparar(usuarioGlobal(), { periodoCensalIds: [1, 2] });

    expect(resultado.puntos.every((p) => p.poblacionTotal === null && !p.suprimido)).toBe(true);
  });

  it('suprime población y cobertura (k-anonimity) cuando el total de un periodo es menor al umbral', async () => {
    const { servicio } = crearServicio(
      [{ comunidad_id: 4, periodo_censal_id: 1, poblacion_total: '3' }],
      [{ comunidad_id: 4, periodo_censal_id: 1, con_acceso: '1', total: '3' }],
    );

    const [resultado] = await servicio.comparar(usuarioGlobal(), { periodoCensalIds: [1, 2] });
    const punto1 = resultado.puntos.find((p) => p.periodoCensalId === 1);

    expect(punto1).toEqual({
      periodoCensalId: 1,
      periodoNombre: 'Censo 2020',
      poblacionTotal: null,
      coberturaServiciosPromedio: null,
      suprimido: true,
    });
  });

  it('retorna un arreglo vacío si el usuario no tiene comunidades permitidas', async () => {
    const { servicio } = crearServicio([], [], []);
    const usuarioSinAcceso = {
      id: 2,
      email: 'b@b.com',
      roles: [],
      asignaciones: [],
    } as never;

    const resultado = await servicio.comparar(usuarioSinAcceso, { periodoCensalIds: [1, 2] });

    expect(resultado).toEqual([]);
  });
});
