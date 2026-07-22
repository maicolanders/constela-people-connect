import { AppDatabase } from '../database/app-database';
import { SyncQueueService } from './sync-queue.service';

describe('SyncQueueService', () => {
  let db: AppDatabase;
  let service: SyncQueueService;

  beforeEach(async () => {
    db = new AppDatabase();
    service = new SyncQueueService(db);
  });

  afterEach(async () => {
    await db.delete();
  });

  it('encola una operación pendiente', async () => {
    await service.encolar('hogares', 'uuid-1', 'crear', { nombre: 'Hogar 1' });
    const pendientes = await service.listarPendientes();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]).toMatchObject({ dominio: 'hogares', uuid: 'uuid-1', operacion: 'crear', estado: 'pendiente' });
  });

  it('reemplaza la entrada pendiente existente en vez de duplicarla', async () => {
    await service.encolar('hogares', 'uuid-1', 'crear', { nombre: 'Hogar 1' });
    await service.encolar('hogares', 'uuid-1', 'actualizar', { nombre: 'Hogar 1 editado' });

    const pendientes = await service.listarPendientes();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].operacion).toBe('actualizar');
    expect(pendientes[0].payload).toEqual({ nombre: 'Hogar 1 editado' });
  });

  it('marcarSincronizado elimina la entrada de la cola', async () => {
    await service.encolar('hogares', 'uuid-2', 'crear', {});
    const [entrada] = await service.listarPendientes();

    await service.marcarSincronizado(entrada.id as number);

    expect(await service.listarPendientes()).toHaveLength(0);
  });

  it('marcarError deja la entrada disponible para reintento automático hasta el límite', async () => {
    await service.encolar('habitantes', 'uuid-4', 'crear', { hogarUuid: 'hogar-no-sincronizado' });
    const [entrada] = await service.listarPendientes();

    // Intentos 1-4: sigue por debajo del límite, se reintenta solo.
    for (let intento = 0; intento < 4; intento++) {
      await service.marcarError(entrada.id as number, 'Hogar aún no sincronizado');
      expect(await service.listarPendientes()).toHaveLength(1);
    }

    // Intento 5: alcanza MAX_INTENTOS_AUTOMATICOS y deja de reintentarse solo.
    await service.marcarError(entrada.id as number, 'Hogar aún no sincronizado');
    expect(await service.listarPendientes()).toHaveLength(0);
  });

  it('marcarConflicto deja la entrada disponible para resolución manual', async () => {
    await service.encolar('hogares', 'uuid-3', 'actualizar', { nombre: 'Local' });
    const [entrada] = await service.listarPendientes();

    await service.marcarConflicto(entrada.id as number, { nombre: 'Servidor' });

    const conflictos = await service.listarConflictos();
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].entidadServidor).toEqual({ nombre: 'Servidor' });

    await service.resolverConflictoManual(entrada.id as number, { nombre: 'Resuelto' });
    const pendientes = await service.listarPendientes();
    expect(pendientes[0].payload).toEqual({ nombre: 'Resuelto' });
  });
});
