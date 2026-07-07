import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo, RolCodigo } from '@censo/shared-data-access';
import { IndicadoresEconomicosQueryDto } from '../dto/indicadores-economicos-query.dto';
import { IndicadoresEconomicosService } from './indicadores-economicos.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.CENSISTA], asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }] };
}

function crearHabitantes(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i + 1,
    estado: EstadoHabitante.ACTIVO,
    sexo: 'F',
    fechaNacimiento: '1990-01-01',
  }));
}

function registro(habitanteId: number, codigoCondicion: string, ocupacionCatalogoItemId: number | null = null) {
  return {
    habitanteId,
    condicionActividadCatalogoItemId: 1,
    condicionActividad: { codigo: codigoCondicion },
    ocupacionCatalogoItemId,
  };
}

function crearServicio(opciones: { habitantes?: unknown[]; registros?: unknown[] }) {
  const ocupacionRepository = { find: jest.fn().mockResolvedValue(opciones.registros ?? []) };
  const habitanteService = { listar: jest.fn().mockResolvedValue(opciones.habitantes ?? []) };
  const periodoCensalService = { obtener: jest.fn().mockResolvedValue({ estado: EstadoPeriodo.ABIERTO, fechaCierre: null }) };

  const servicio = new IndicadoresEconomicosService(ocupacionRepository as never, habitanteService as never, periodoCensalService as never);
  return { servicio };
}

function dtoBase(overrides: Partial<IndicadoresEconomicosQueryDto> = {}): IndicadoresEconomicosQueryDto {
  return { comunidadId: 3, periodoCensalId: 1, ...overrides };
}

describe('IndicadoresEconomicosService.obtener', () => {
  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio({});

    await expect(servicio.obtener(crearUsuario(9), dtoBase())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcula la tasa de desempleo sobre la PEA (ocupados + desempleados), no sobre toda la población', async () => {
    const habitantes = crearHabitantes(5);
    const registros = [
      registro(1, 'ocupado', 10),
      registro(2, 'ocupado', 10),
      registro(3, 'desempleado'),
      registro(4, 'inactivo'),
      registro(5, 'estudiante'),
    ];
    const { servicio } = crearServicio({ habitantes, registros });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.poblacionConDato).toBe(5);
    // PEA = 3 (2 ocupados + 1 desempleado); tasa = 1/3 = 33.3%
    expect(resultado.tasaDesempleo).toBe(33.3);
  });

  it('distribuye por tipo de ocupación (solo entre los "ocupado") y suprime por debajo del umbral k-anonimity', async () => {
    const habitantes = crearHabitantes(6);
    const registros = [
      registro(1, 'ocupado', 10),
      registro(2, 'ocupado', 10),
      registro(3, 'ocupado', 10),
      registro(4, 'ocupado', 10),
      registro(5, 'ocupado', 10),
      registro(6, 'ocupado', 20),
    ];
    const { servicio } = crearServicio({ habitantes, registros });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.distribucionOcupacional).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ocupacionCatalogoItemId: 10, total: 5, suprimido: false }),
        expect.objectContaining({ ocupacionCatalogoItemId: 20, total: null, suprimido: true }),
      ]),
    );
  });

  it('sin nadie en la PEA, la tasa de desempleo queda null (no 0/0)', async () => {
    const habitantes = crearHabitantes(2);
    const registros = [registro(1, 'inactivo'), registro(2, 'labores_hogar')];
    const { servicio } = crearServicio({ habitantes, registros });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.tasaDesempleo).toBeNull();
  });
});
