import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo, RolCodigo, SexoHabitante } from '@censo/shared-data-access';
import { calcularEdad, calcularGrupoQuinquenal } from '@censo/shared-util';
import { PiramidePoblacionalService } from './piramide-poblacional.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return {
    id: 1,
    email: 'analista@censo.test',
    roles: [RolCodigo.ANALISTA],
    asignaciones: [{ rol: RolCodigo.ANALISTA, comunidadId }],
  };
}

function crearHabitante(fechaNacimiento: string, sexo: SexoHabitante) {
  return { fechaNacimiento, sexo, estado: EstadoHabitante.ACTIVO, comunidadId: 3, periodoCensalId: 1 };
}

describe('PiramidePoblacionalService', () => {
  function crearServicio(habitantes: unknown[], periodo: { estado: EstadoPeriodo; fechaCierre: string | null }) {
    const habitanteRepository = { find: jest.fn().mockResolvedValue(habitantes) };
    const periodoCensalService = { obtener: jest.fn().mockResolvedValue({ id: 1, ...periodo }) };
    const servicio = new PiramidePoblacionalService(habitanteRepository as never, periodoCensalService as never);
    return { servicio, habitanteRepository };
  }

  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio([], { estado: EstadoPeriodo.CERRADO, fechaCierre: '2026-01-01' });

    await expect(
      servicio.obtener(crearUsuario(9), { comunidadId: 3, periodoCensalId: 1 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('agrupa por grupo quinquenal y sexo contra fechaCierre cuando el periodo está cerrado', async () => {
    const cincoNinos = Array.from({ length: 5 }, () => crearHabitante('2020-01-01', SexoHabitante.MASCULINO));
    const unaAdulta = [crearHabitante('1990-01-01', SexoHabitante.FEMENINO)];
    const { servicio } = crearServicio([...cincoNinos, ...unaAdulta], {
      estado: EstadoPeriodo.CERRADO,
      fechaCierre: '2026-01-01',
    });

    const buckets = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    const grupoNinos = buckets.find((b) => b.grupoQuinquenal === '5-9' && b.sexo === SexoHabitante.MASCULINO);
    expect(grupoNinos).toEqual({ grupoQuinquenal: '5-9', sexo: 'M', total: 5, suprimido: false });
  });

  it('suprime (k-anonimity) un bucket con menos de 5 personas', async () => {
    const unaAdulta = [crearHabitante('1990-01-01', SexoHabitante.FEMENINO)];
    const { servicio } = crearServicio(unaAdulta, { estado: EstadoPeriodo.CERRADO, fechaCierre: '2026-01-01' });

    const buckets = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    const grupoAdulta = buckets.find((b) => b.grupoQuinquenal === '35-39' && b.sexo === SexoHabitante.FEMENINO);
    expect(grupoAdulta).toEqual({ grupoQuinquenal: '35-39', sexo: 'F', total: null, suprimido: true });
  });

  it('usa la fecha actual como referencia cuando el periodo sigue abierto (RF-02-02: "dinámicamente a partir de datos vigentes")', async () => {
    const fechaNacimiento = '2000-06-15';
    const cincoPersonas = Array.from({ length: 5 }, () => crearHabitante(fechaNacimiento, SexoHabitante.FEMENINO));
    const { servicio } = crearServicio(cincoPersonas, { estado: EstadoPeriodo.ABIERTO, fechaCierre: null });

    const buckets = await servicio.obtener(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });

    const edadEsperada = calcularEdad(new Date(fechaNacimiento), new Date());
    const grupoEsperado = calcularGrupoQuinquenal(edadEsperada);
    const bucket = buckets.find((b) => b.grupoQuinquenal === grupoEsperado && b.sexo === SexoHabitante.FEMENINO);
    expect(bucket?.total).toBe(5);
  });
});
