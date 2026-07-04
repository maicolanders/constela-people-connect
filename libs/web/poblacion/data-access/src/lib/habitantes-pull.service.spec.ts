import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppDatabase } from '@censo/web-shared-data-access';
import { HabitantesPullService } from './habitantes-pull.service';

// fake-indexeddb resuelve sus callbacks en macrotasks reales: hay que ceder el
// hilo entre la primera petición (hogares) y la segunda (habitantes), que solo
// se dispara después de escribir (transacción de varios pasos) la respuesta
// de hogares en IndexedDB.
function esperarMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

const HOGAR_API = {
  id: 10,
  uuid: 'hogar-uuid-1',
  comunidadId: 1,
  periodoCensalId: 1,
  estado: 'activo',
  motivoBaja: null,
  direccionReferencia: null,
  consentimientoInformado: false,
  consentimientoFecha: null,
  jefeHogarId: null,
};

describe('HabitantesPullService', () => {
  let db: AppDatabase;
  let servicio: HabitantesPullService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    db = TestBed.inject(AppDatabase);
    servicio = TestBed.inject(HabitantesPullService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
    await db.delete();
  });

  it('descarga hogares y habitantes, resolviendo hogarUuid a partir del hogarId', async () => {
    const promesa = servicio.actualizar(1);

    httpMock.expectOne((req) => req.url === '/api/poblacion/hogares').flush([HOGAR_API]);
    await esperarMacrotask();

    httpMock.expectOne((req) => req.url === '/api/poblacion/habitantes').flush([
      {
        id: 100,
        uuid: 'habitante-uuid-1',
        hogarId: 10,
        comunidadId: 1,
        periodoCensalId: 1,
        estado: 'activo',
        nombres: 'Ana',
        apellidos: 'Perez',
        tipoDocumentoId: null,
        fechaNacimiento: '1990-01-01',
        sexo: 'F',
        consentimientoInformado: false,
        consentimientoFecha: null,
      },
    ]);
    await promesa;

    const habitanteLocal = await db.habitantes.get('habitante-uuid-1');
    expect(habitanteLocal?.hogarUuid).toBe('hogar-uuid-1');
    expect(habitanteLocal?.origen).toBe('servidor');

    const hogarLocal = await db.hogares.get('hogar-uuid-1');
    expect(hogarLocal?.origen).toBe('servidor');
  });

  it('no sobrescribe un habitante local pendiente de sincronizar', async () => {
    await db.habitantes.put({
      uuid: 'habitante-uuid-1',
      hogarUuid: 'hogar-uuid-1',
      comunidadId: 1,
      periodoCensalId: 1,
      estado: 'activo',
      nombres: 'Nombre Local',
      apellidos: 'Apellido Local',
      fechaNacimiento: '1990-01-01',
      sexo: 'F',
      origen: 'local',
    });

    const promesa = servicio.actualizar(1);
    httpMock.expectOne((req) => req.url === '/api/poblacion/hogares').flush([HOGAR_API]);
    await esperarMacrotask();

    httpMock.expectOne((req) => req.url === '/api/poblacion/habitantes').flush([
      {
        id: 100,
        uuid: 'habitante-uuid-1',
        hogarId: 10,
        comunidadId: 1,
        periodoCensalId: 1,
        estado: 'activo',
        nombres: 'Nombre Servidor',
        apellidos: 'Apellido Servidor',
        tipoDocumentoId: null,
        fechaNacimiento: '1990-01-01',
        sexo: 'F',
        consentimientoInformado: false,
        consentimientoFecha: null,
      },
    ]);
    await promesa;

    const habitanteLocal = await db.habitantes.get('habitante-uuid-1');
    expect(habitanteLocal?.nombres).toBe('Nombre Local');
    expect(habitanteLocal?.origen).toBe('local');
  });

  it('no sobrescribe un hogar local pendiente de sincronizar', async () => {
    await db.hogares.put({
      uuid: 'hogar-uuid-1',
      comunidadId: 1,
      periodoCensalId: 1,
      estado: 'activo',
      direccionReferencia: 'Dirección local',
      origen: 'local',
    });

    const promesa = servicio.actualizar(1);
    httpMock.expectOne((req) => req.url === '/api/poblacion/hogares').flush([
      { ...HOGAR_API, direccionReferencia: 'Dirección servidor' },
    ]);
    await esperarMacrotask();
    httpMock.expectOne((req) => req.url === '/api/poblacion/habitantes').flush([]);
    await promesa;

    const hogarLocal = await db.hogares.get('hogar-uuid-1');
    expect(hogarLocal?.direccionReferencia).toBe('Dirección local');
    expect(hogarLocal?.origen).toBe('local');
  });
});
