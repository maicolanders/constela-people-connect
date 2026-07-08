import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { CaracterizacionEtnicaQueryDto } from '../dto/caracterizacion-etnica-query.dto';
import { CaracterizacionEtnicaService } from './caracterizacion-etnica.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.CENSISTA], asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }] };
}

function crearHabitantes(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({ id: i + 1 }));
}

function etnia(habitanteId: number, nombre: string) {
  return { habitanteId, etnia: { nombre } };
}

function condicion(habitanteId: number, nombre: string) {
  return { habitanteId, condicionVulnerabilidad: { nombre } };
}

function crearServicio(opciones: { habitantes?: unknown[]; etnias?: unknown[]; condiciones?: unknown[] }) {
  const etniaRepository = { find: jest.fn().mockResolvedValue(opciones.etnias ?? []) };
  const condicionRepository = { find: jest.fn().mockResolvedValue(opciones.condiciones ?? []) };
  const habitanteService = { listar: jest.fn().mockResolvedValue(opciones.habitantes ?? []) };

  const servicio = new CaracterizacionEtnicaService(etniaRepository as never, condicionRepository as never, habitanteService as never);
  return { servicio, etniaRepository, condicionRepository, habitanteService };
}

function dtoBase(overrides: Partial<CaracterizacionEtnicaQueryDto> = {}): CaracterizacionEtnicaQueryDto {
  return { periodoCensalId: 1, ...overrides };
}

describe('CaracterizacionEtnicaService.obtener', () => {
  it('pasa comunidadId y periodoCensalId a HabitanteService.listar', async () => {
    const { servicio, habitanteService } = crearServicio({});

    await servicio.obtener(crearUsuario(), dtoBase({ comunidadId: 3 }));

    expect(habitanteService.listar).toHaveBeenCalledWith(crearUsuario(), { comunidadId: 3, periodoCensalId: 1 });
  });

  it('consolidado nacional: omite comunidadId cuando no viene en el query (HabitanteService.listar decide el alcance)', async () => {
    const { servicio, habitanteService } = crearServicio({});

    const resultado = await servicio.obtener(crearUsuario(null), dtoBase());

    expect(habitanteService.listar).toHaveBeenCalledWith(crearUsuario(null), { comunidadId: undefined, periodoCensalId: 1 });
    expect(resultado.comunidadId).toBeNull();
  });

  it('agrupa por etnia y por condición de vulnerabilidad, sin suprimir grupos grandes', async () => {
    const habitantes = crearHabitantes(10);
    const etnias = Array.from({ length: 6 }, (_, i) => etnia(i + 1, 'Nasa'));
    const condiciones = Array.from({ length: 7 }, (_, i) => condicion(i + 1, 'Discapacidad física'));
    const { servicio } = crearServicio({ habitantes, etnias, condiciones });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase({ comunidadId: 3 }));

    expect(resultado.totalHabitantes).toBe(10);
    expect(resultado.porEtnia).toEqual([expect.objectContaining({ categoria: 'Nasa', total: 6, suprimido: false })]);
    expect(resultado.porCondicionVulnerabilidad).toEqual([
      expect.objectContaining({ categoria: 'Discapacidad física', total: 7, suprimido: false }),
    ]);
  });

  it('suprime grupos por debajo del umbral k-anonimity', async () => {
    const habitantes = crearHabitantes(10);
    const etnias = [etnia(1, 'Wayuu')];
    const { servicio } = crearServicio({ habitantes, etnias });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase({ comunidadId: 3 }));

    expect(resultado.porEtnia).toEqual([expect.objectContaining({ categoria: 'Wayuu', total: null, suprimido: true })]);
  });

  it('sin habitantes, no consulta etnias/condiciones y devuelve listas vacías', async () => {
    const { servicio, etniaRepository, condicionRepository } = crearServicio({ habitantes: [] });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase({ comunidadId: 3 }));

    expect(etniaRepository.find).not.toHaveBeenCalled();
    expect(condicionRepository.find).not.toHaveBeenCalled();
    expect(resultado.totalHabitantes).toBe(0);
    expect(resultado.porEtnia).toEqual([]);
    expect(resultado.porCondicionVulnerabilidad).toEqual([]);
  });
});
