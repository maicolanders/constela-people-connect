import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppDatabase } from '@censo/web-shared-data-access';
import { UbicacionesGeograficasOfflineService } from './ubicaciones-geograficas-offline.service';

const RAIZ_API = { id: 1, nivelGeograficoCatalogoItemId: 10, padreId: null, nombre: 'Colombia', codigo: 'CO' };
const HIJO_API = { id: 2, nivelGeograficoCatalogoItemId: 11, padreId: 1, nombre: 'Cauca', codigo: '19' };

describe('UbicacionesGeograficasOfflineService', () => {
  let db: AppDatabase;
  let servicio: UbicacionesGeograficasOfflineService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    db = TestBed.inject(AppDatabase);
    servicio = TestBed.inject(UbicacionesGeograficasOfflineService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
    await db.delete();
  });

  it('consulta el árbol de raíces (sin padreId) y refresca la caché local', async () => {
    const promesa = servicio.listarHijos();

    httpMock.expectOne('/api/georreferenciacion/ubicaciones-geograficas').flush([RAIZ_API]);
    const resultado = await promesa;

    expect(resultado).toEqual([expect.objectContaining({ id: 1, nombre: 'Colombia', padreId: null })]);
  });

  it('consulta los hijos de un nodo dado por padreId', async () => {
    const promesa = servicio.listarHijos(1);

    httpMock.expectOne('/api/georreferenciacion/ubicaciones-geograficas?padreId=1').flush([HIJO_API]);
    const resultado = await promesa;

    expect(resultado).toEqual([expect.objectContaining({ id: 2, nombre: 'Cauca', padreId: 1 })]);
  });

  it('si la petición falla, sirve desde la caché local ya guardada', async () => {
    const primerLlamado = servicio.listarHijos();
    httpMock.expectOne('/api/georreferenciacion/ubicaciones-geograficas').flush([RAIZ_API]);
    await primerLlamado;

    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    const resultado = await servicio.listarHijos();

    expect(resultado).toEqual([expect.objectContaining({ id: 1, nombre: 'Colombia' })]);
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  });
});
