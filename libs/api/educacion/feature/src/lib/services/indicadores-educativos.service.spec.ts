import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo, RolCodigo, SexoHabitante } from '@censo/shared-data-access';
import { IndicadoresEducativosQueryDto } from '../dto/indicadores-educativos-query.dto';
import { IndicadoresEducativosService } from './indicadores-educativos.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.CENSISTA], asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }] };
}

function crearHabitantes(cantidad: number, sexo: SexoHabitante = SexoHabitante.FEMENINO) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i + 1,
    estado: EstadoHabitante.ACTIVO,
    sexo,
    fechaNacimiento: '1990-01-01',
  }));
}

function crearServicio(opciones: {
  habitantes?: unknown[];
  registros?: Array<{ habitanteId: number; alfabetizado: boolean; asisteEscuela: boolean; nivelEducativoCatalogoItemId: number }>;
}) {
  const educacionRepository = { find: jest.fn().mockResolvedValue(opciones.registros ?? []) };
  const habitanteService = { listar: jest.fn().mockResolvedValue(opciones.habitantes ?? []) };
  const periodoCensalService = { obtener: jest.fn().mockResolvedValue({ estado: EstadoPeriodo.ABIERTO, fechaCierre: null }) };

  const servicio = new IndicadoresEducativosService(educacionRepository as never, habitanteService as never, periodoCensalService as never);
  return { servicio, habitanteService };
}

function dtoBase(overrides: Partial<IndicadoresEducativosQueryDto> = {}): IndicadoresEducativosQueryDto {
  return { comunidadId: 3, periodoCensalId: 1, ...overrides };
}

describe('IndicadoresEducativosService.obtener', () => {
  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio({});

    await expect(servicio.obtener(crearUsuario(9), dtoBase())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcula tasa de alfabetismo y asistencia escolar sobre la población con dato registrado', async () => {
    const habitantes = crearHabitantes(4);
    const registros = [
      { habitanteId: 1, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 2, alfabetizado: true, asisteEscuela: false, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 3, alfabetizado: false, asisteEscuela: false, nivelEducativoCatalogoItemId: 6 },
      { habitanteId: 4, alfabetizado: false, asisteEscuela: false, nivelEducativoCatalogoItemId: 6 },
    ];
    const { servicio } = crearServicio({ habitantes, registros });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.poblacionConDato).toBe(4);
    expect(resultado.tasaAlfabetismo).toBe(50);
    expect(resultado.tasaAsistenciaEscolar).toBe(25);
  });

  it('distribuye por nivel educativo y suprime niveles con menos del umbral k-anonimity', async () => {
    const habitantes = crearHabitantes(6);
    const registros = [
      { habitanteId: 1, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 2, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 3, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 4, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 5, alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 5 },
      { habitanteId: 6, alfabetizado: false, asisteEscuela: false, nivelEducativoCatalogoItemId: 6 },
    ];
    const { servicio } = crearServicio({ habitantes, registros });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.distribucionNivelEducativo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nivelEducativoCatalogoItemId: 5, total: 5, suprimido: false }),
        expect.objectContaining({ nivelEducativoCatalogoItemId: 6, total: null, suprimido: true }),
      ]),
    );
  });

  it('filtra la población por sexo antes de consultar los registros de educación', async () => {
    const habitantes = [
      ...crearHabitantes(2, SexoHabitante.FEMENINO),
      ...crearHabitantes(2, SexoHabitante.MASCULINO).map((h, i) => ({ ...h, id: i + 10 })),
    ];
    const educacionRepository = { find: jest.fn().mockResolvedValue([]) };
    const habitanteService = { listar: jest.fn().mockResolvedValue(habitantes) };
    const periodoCensalService = { obtener: jest.fn().mockResolvedValue({ estado: EstadoPeriodo.ABIERTO, fechaCierre: null }) };
    const servicio = new IndicadoresEducativosService(educacionRepository as never, habitanteService as never, periodoCensalService as never);

    await servicio.obtener(crearUsuario(), dtoBase({ sexo: SexoHabitante.MASCULINO }));

    const idsConsultados = (educacionRepository.find.mock.calls[0][0].where.habitanteId as { value: number[] }).value;
    expect(idsConsultados.sort()).toEqual([10, 11]);
  });

  it('sin población con dato, las tasas quedan null (no 0/0)', async () => {
    const { servicio } = crearServicio({ habitantes: [], registros: [] });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado).toEqual(
      expect.objectContaining({ poblacionConDato: 0, tasaAlfabetismo: null, tasaAsistenciaEscolar: null }),
    );
  });
});
