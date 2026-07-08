import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { IndicadoresRecursosService } from './indicadores-recursos.service';

function crearUsuario(comunidadId: number | null = 4): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.ANALISTA], asignaciones: [{ rol: RolCodigo.ANALISTA, comunidadId }] };
}

const COMUNIDAD_GUAMBIANO = { id: 4, nombre: 'Guambiano' };
const COMUNIDAD_WAYUU = { id: 5, nombre: 'Wayuu' };

function viviendaAdecuada(comunidadId: number, habitantesActivos = 2) {
  return {
    comunidad_id: comunidadId,
    habitantes_activos: String(habitantesActivos),
    numero_dormitorios: 2,
    tipo_vivienda_codigo: 'casa',
    material_pared_codigo: 'bloque_ladrillo',
    material_piso_codigo: 'cemento',
    agua_estado: 'si',
    saneamiento_estado: 'si',
  };
}

function crearServicio(opciones: {
  comunidades?: unknown[];
  poblacion?: { comunidad_id: number; total: string }[];
  filasNbi?: unknown[];
  educacion?: { comunidad_id: number; total_con_dato: string; asisten: string }[];
  vulnerabilidad?: { comunidad_id: number; con_condicion: string }[];
}) {
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('FROM hogares g')) return opciones.filasNbi ?? [];
      if (sql.includes('FROM habitante_educaciones')) return opciones.educacion ?? [];
      if (sql.includes('FROM habitante_condiciones_vulnerabilidad')) return opciones.vulnerabilidad ?? [];
      if (sql.includes('as total FROM habitantes')) return opciones.poblacion ?? [];
      return [];
    }),
  };
  const comunidadService = { listar: jest.fn().mockResolvedValue(opciones.comunidades ?? [COMUNIDAD_GUAMBIANO, COMUNIDAD_WAYUU]) };

  const servicio = new IndicadoresRecursosService(dataSource as never, comunidadService as never);
  return { servicio, dataSource, comunidadService };
}

describe('IndicadoresRecursosService.obtener', () => {
  it('filtra a las comunidades permitidas del usuario (no global)', async () => {
    const { servicio, dataSource } = crearServicio({
      poblacion: [{ comunidad_id: 4, total: '10' }],
    });

    const resultado = await servicio.obtener(crearUsuario(4), { periodoCensalId: 1 });

    expect(resultado.comunidades).toHaveLength(1);
    expect(resultado.comunidades[0].comunidadId).toBe(4);
    expect(dataSource.query).toHaveBeenCalledWith(expect.any(String), [1, [4]]);
  });

  it('usuario global ve todas las comunidades', async () => {
    const { servicio } = crearServicio({
      poblacion: [
        { comunidad_id: 4, total: '10' },
        { comunidad_id: 5, total: '10' },
      ],
    });

    const resultado = await servicio.obtener(crearUsuario(null), { periodoCensalId: 1 });

    expect(resultado.comunidades.map((c) => c.comunidadId).sort()).toEqual([4, 5]);
  });

  it('calcula tasaNbi reutilizando calcularNbi sobre las filas de hogares', async () => {
    const { servicio } = crearServicio({
      comunidades: [COMUNIDAD_GUAMBIANO],
      poblacion: [{ comunidad_id: 4, total: '10' }],
      filasNbi: [
        viviendaAdecuada(4),
        viviendaAdecuada(4),
        { ...viviendaAdecuada(4, 8), numero_dormitorios: 2 }, // hacinamiento 4 > 3 -> NBI
      ],
    });

    const resultado = await servicio.obtener(crearUsuario(null), { periodoCensalId: 1 });

    expect(resultado.comunidades[0].tasaNbi).toBeCloseTo(33.3, 1);
  });

  it('calcula coberturaEducativa y tasaVulnerabilidad', async () => {
    const { servicio } = crearServicio({
      comunidades: [COMUNIDAD_GUAMBIANO],
      poblacion: [{ comunidad_id: 4, total: '10' }],
      educacion: [{ comunidad_id: 4, total_con_dato: '10', asisten: '8' }],
      vulnerabilidad: [{ comunidad_id: 4, con_condicion: '2' }],
    });

    const resultado = await servicio.obtener(crearUsuario(null), { periodoCensalId: 1 });

    expect(resultado.comunidades[0].coberturaEducativa).toBe(80);
    expect(resultado.comunidades[0].tasaVulnerabilidad).toBe(20);
  });

  it('suprime (k-anonimity) comunidades con población pequeña y anula también las tasas derivadas', async () => {
    const { servicio } = crearServicio({
      comunidades: [COMUNIDAD_GUAMBIANO],
      poblacion: [{ comunidad_id: 4, total: '3' }],
      educacion: [{ comunidad_id: 4, total_con_dato: '3', asisten: '3' }],
    });

    const resultado = await servicio.obtener(crearUsuario(null), { periodoCensalId: 1 });

    expect(resultado.comunidades[0]).toEqual(
      expect.objectContaining({
        poblacionTotal: null,
        coberturaEducativa: null,
        tasaVulnerabilidad: null,
        tasaNbi: null,
        suprimido: true,
      }),
    );
  });

  it('sin comunidades permitidas, no consulta la base de datos y devuelve lista vacía', async () => {
    const { servicio, dataSource, comunidadService } = crearServicio({ comunidades: [COMUNIDAD_WAYUU] });

    const resultado = await servicio.obtener(crearUsuario(4), { periodoCensalId: 1 });

    expect(comunidadService.listar).toHaveBeenCalled();
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(resultado.comunidades).toEqual([]);
  });
});
