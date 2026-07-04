import { TestBed } from '@angular/core/testing';
import { AppDatabase, HabitanteOffline } from '@censo/web-shared-data-access';
import { EstadoHabitante } from '@censo/shared-data-access';
import { DeteccionDuplicadosService } from './deteccion-duplicados.service';

function crearHabitanteOffline(overrides: Partial<HabitanteOffline> = {}): HabitanteOffline {
  return {
    uuid: 'h-1',
    hogarUuid: 'hogar-1',
    comunidadId: 1,
    periodoCensalId: 1,
    estado: EstadoHabitante.ACTIVO,
    nombres: 'Maria Jose',
    apellidos: 'Tunubala Yule',
    fechaNacimiento: '1995-03-10',
    sexo: 'F',
    origen: 'servidor',
    ...overrides,
  };
}

describe('DeteccionDuplicadosService', () => {
  let db: AppDatabase;
  let servicio: DeteccionDuplicadosService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    db = TestBed.inject(AppDatabase);
    servicio = TestBed.inject(DeteccionDuplicadosService);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('detecta como candidato un registro con typo menor en el nombre (mismo caso que similitud-duplicados.spec.ts)', async () => {
    await db.habitantes.put(crearHabitanteOffline());

    const candidatos = await servicio.buscarCandidatos({
      nombres: 'Maria Jse',
      apellidos: 'Tunubala Yule',
      fechaNacimiento: new Date('1995-03-10'),
      comunidadId: 1,
    });

    expect(candidatos).toHaveLength(1);
    expect(candidatos[0].uuid).toBe('h-1');
  });

  it('no devuelve candidatos por debajo del umbral', async () => {
    await db.habitantes.put(crearHabitanteOffline());

    const candidatos = await servicio.buscarCandidatos({
      nombres: 'Carlos Andres',
      apellidos: 'Perez Gomez',
      fechaNacimiento: new Date('1970-01-01'),
      comunidadId: 1,
    });

    expect(candidatos).toHaveLength(0);
  });

  it('ignora habitantes dados de baja (estado distinto de activo)', async () => {
    await db.habitantes.put(crearHabitanteOffline({ estado: EstadoHabitante.FALLECIDO }));

    const candidatos = await servicio.buscarCandidatos({
      nombres: 'Maria Jose',
      apellidos: 'Tunubala Yule',
      fechaNacimiento: new Date('1995-03-10'),
      comunidadId: 1,
    });

    expect(candidatos).toHaveLength(0);
  });

  it('ignora habitantes de otra comunidad', async () => {
    await db.habitantes.put(crearHabitanteOffline({ uuid: 'h-2', comunidadId: 2 }));

    const candidatos = await servicio.buscarCandidatos({
      nombres: 'Maria Jose',
      apellidos: 'Tunubala Yule',
      fechaNacimiento: new Date('1995-03-10'),
      comunidadId: 1,
    });

    expect(candidatos).toHaveLength(0);
  });
});
