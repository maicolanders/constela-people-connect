import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppDatabase } from '../database/app-database';
import { SyncQueueService } from './sync-queue.service';
import { SyncService } from './sync.service';

// fake-indexeddb resuelve sus callbacks en macrotasks reales, no en microtasks:
// hay que ceder el hilo antes de esperar la petición HTTP disparada tras leer la cola.
function esperarMacrotask(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('SyncService', () => {
  let service: SyncService;
  let syncQueue: SyncQueueService;
  let db: AppDatabase;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    db = TestBed.inject(AppDatabase);
    syncQueue = TestBed.inject(SyncQueueService);
    service = TestBed.inject(SyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(async () => {
    httpMock.verify();
    await db.delete();
  });

  it('no hace nada si está sin conexión', async () => {
    service.enLinea.set(false);
    await service.sincronizar();
    httpMock.expectNone(() => true);
  });

  it('envía las operaciones pendientes agrupadas por dominio y marca como sincronizadas las aplicadas', async () => {
    await syncQueue.encolar('hogares', 'uuid-1', 'crear', { nombre: 'Hogar 1' });
    service.enLinea.set(true);

    const promesa = service.sincronizar();
    await esperarMacrotask();
    const peticion = httpMock.expectOne('/api/sync/hogares');
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual([
      expect.objectContaining({ uuid: 'uuid-1', operacion: 'crear', payload: { nombre: 'Hogar 1' } }),
    ]);
    peticion.flush([{ uuid: 'uuid-1', estado: 'aplicado' }]);
    await promesa;

    expect(await syncQueue.listarPendientes()).toHaveLength(0);
  });

  it('marca en conflicto la entrada cuando el servidor lo reporta', async () => {
    await syncQueue.encolar('hogares', 'uuid-2', 'actualizar', { nombre: 'Local' });
    service.enLinea.set(true);

    const promesa = service.sincronizar();
    await esperarMacrotask();
    const peticion = httpMock.expectOne('/api/sync/hogares');
    peticion.flush([{ uuid: 'uuid-2', estado: 'conflicto', entidad: { nombre: 'Servidor' } }]);
    await promesa;

    const conflictos = await syncQueue.listarConflictos();
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].entidadServidor).toEqual({ nombre: 'Servidor' });
  });

  it('marca error y conserva la entrada pendiente para reintentar si falla la petición', async () => {
    await syncQueue.encolar('hogares', 'uuid-3', 'crear', {});
    service.enLinea.set(true);

    const promesa = service.sincronizar();
    await esperarMacrotask();
    const peticion = httpMock.expectOne('/api/sync/hogares');
    peticion.flush('fallo', { status: 500, statusText: 'Server Error' });
    await promesa;

    const pendientes = await syncQueue.listarPendientes();
    expect(pendientes).toHaveLength(0); // pasó a estado 'error', ya no es 'pendiente'

    const items = await db.colaSincronizacion.toArray();
    expect(items[0].estado).toBe('error');
    expect(items[0].intentos).toBe(1);
  });
});
