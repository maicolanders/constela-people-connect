import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { EstadoHabitante, SexoHabitante } from '@censo/shared-data-access';
import { calcularEdad, calcularGrupoQuinquenal } from '@censo/shared-util';
import { BucketPiramide, PiramidePoblacionalService } from './piramide-poblacional.service';

function crearHabitante(overrides: Partial<{ fechaNacimiento: string; sexo: string; periodoCensalId: number; estado: string }>) {
  return {
    uuid: Math.random().toString(),
    hogarUuid: 'hogar-1',
    comunidadId: 3,
    periodoCensalId: 1,
    estado: EstadoHabitante.ACTIVO,
    nombres: 'X',
    apellidos: 'Y',
    fechaNacimiento: '2020-01-01',
    sexo: SexoHabitante.MASCULINO,
    origen: 'servidor' as const,
    ...overrides,
  };
}

const GRUPO_NINO = calcularGrupoQuinquenal(calcularEdad(new Date('2020-01-01'), new Date()));
const GRUPO_ADULTA = calcularGrupoQuinquenal(calcularEdad(new Date('1990-01-01'), new Date()));

describe('PiramidePoblacionalService (frontend)', () => {
  function crearServicio(opciones: { httpFalla?: boolean; respuestaHttp?: BucketPiramide[]; habitantes?: unknown[] }) {
    const http = {
      get: jest.fn().mockReturnValue(
        opciones.httpFalla ? throwError(() => new Error('offline')) : of(opciones.respuestaHttp ?? []),
      ),
    };
    const habitantesOffline = { listarPorComunidad: jest.fn().mockResolvedValue(opciones.habitantes ?? []) };

    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: http },
        { provide: HabitantesOfflineService, useValue: habitantesOffline },
      ],
    });

    return { servicio: TestBed.inject(PiramidePoblacionalService), http, habitantesOffline };
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('usa la respuesta del backend cuando hay conexión', async () => {
    const respuestaHttp: BucketPiramide[] = [{ grupoQuinquenal: '0-4', sexo: 'M', total: 7, suprimido: false }];
    const { servicio, habitantesOffline } = crearServicio({ respuestaHttp });

    const resultado = await servicio.obtener(3, 1);

    expect(resultado).toEqual(respuestaHttp);
    expect(habitantesOffline.listarPorComunidad).not.toHaveBeenCalled();
  });

  it('calcula localmente cuando falla la petición (sin conexión), agrupando por grupo quinquenal y sexo', async () => {
    const cincoNinos = Array.from({ length: 5 }, () => crearHabitante({ fechaNacimiento: '2020-01-01', sexo: SexoHabitante.MASCULINO }));
    const { servicio } = crearServicio({ httpFalla: true, habitantes: cincoNinos });

    const buckets = await servicio.obtener(3, 1);

    const bucket = buckets.find((b) => b.grupoQuinquenal === GRUPO_NINO && b.sexo === SexoHabitante.MASCULINO);
    expect(bucket?.total).toBe(5);
    expect(bucket?.suprimido).toBe(false);
  });

  it('en el cálculo local, filtra por periodoCensalId y solo cuenta habitantes activos', async () => {
    const cincoValidos = Array.from({ length: 5 }, () =>
      crearHabitante({ periodoCensalId: 1, estado: EstadoHabitante.ACTIVO, fechaNacimiento: '2020-01-01', sexo: SexoHabitante.MASCULINO }),
    );
    const otroPeriodo = crearHabitante({ periodoCensalId: 2, estado: EstadoHabitante.ACTIVO, fechaNacimiento: '2020-01-01', sexo: SexoHabitante.MASCULINO });
    const dadoDeBaja = crearHabitante({ periodoCensalId: 1, estado: EstadoHabitante.FALLECIDO, fechaNacimiento: '2020-01-01', sexo: SexoHabitante.MASCULINO });
    const { servicio } = crearServicio({ httpFalla: true, habitantes: [...cincoValidos, otroPeriodo, dadoDeBaja] });

    const buckets = await servicio.obtener(3, 1);
    const bucket = buckets.find((b) => b.grupoQuinquenal === GRUPO_NINO && b.sexo === SexoHabitante.MASCULINO);

    // Solo los 5 válidos (mismo periodo, activos); ni el de otro periodo ni el dado de baja cuentan.
    expect(bucket?.total).toBe(5);
  });

  it('suprime (k-anonimity) un bucket local con menos de 5 personas', async () => {
    const unaPersona = [crearHabitante({ fechaNacimiento: '1990-01-01', sexo: SexoHabitante.FEMENINO })];
    const { servicio } = crearServicio({ httpFalla: true, habitantes: unaPersona });

    const buckets = await servicio.obtener(3, 1);
    const bucket = buckets.find((b) => b.grupoQuinquenal === GRUPO_ADULTA && b.sexo === SexoHabitante.FEMENINO);

    expect(bucket?.suprimido).toBe(true);
    expect(bucket?.total).toBeNull();
  });
});
