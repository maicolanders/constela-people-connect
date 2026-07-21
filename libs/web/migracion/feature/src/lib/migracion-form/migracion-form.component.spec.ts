import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { UbicacionesGeograficasOfflineService } from '@censo/web-georreferenciacion-data-access';
import { HabitantesOfflineService, PeriodoActualService } from '@censo/web-poblacion-data-access';
import { MigracionOfflineService } from '@censo/web-migracion-data-access';
import { DireccionMigratoria, TipoMovimientoMigratorio } from '@censo/shared-data-access';
import { MigracionFormComponent } from './migracion-form.component';

const MOTIVO_TRABAJO = { id: 1, codigo: 'trabajo', nombre: 'Trabajo', padreId: null, orden: 0 };
const NODO_CAUCA = { id: 2, codigo: 'cauca', nombre: 'Cauca', padreId: null, orden: 0 };

function crearComponente(eventosExistentes: unknown[] = []) {
  const migracionOffline = {
    listarPorHabitante: jest.fn().mockResolvedValue(eventosExistentes),
    guardar: jest.fn().mockResolvedValue(undefined),
  };
  const ubicacionesGeograficasOffline = { listarHijos: jest.fn().mockResolvedValue([NODO_CAUCA]) };
  const habitantesOffline = { obtener: jest.fn().mockResolvedValue({ hogarUuid: 'hogar-uuid-1' }) };
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([MOTIVO_TRABAJO]) };
  const periodoActual = { obtenerIdAbierto: jest.fn().mockResolvedValue(5) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: MigracionOfflineService, useValue: migracionOffline },
      { provide: UbicacionesGeograficasOfflineService, useValue: ubicacionesGeograficasOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: PeriodoActualService, useValue: periodoActual },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(MigracionFormComponent);
  return { componente: fixture.componentInstance, migracionOffline, syncService, periodoActual, router };
}

describe('MigracionFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('inicializa el contador de eventos capturados a partir de los eventos ya guardados para el habitante', async () => {
    const { componente, migracionOffline } = crearComponente([{ uuid: 'evento-1' }, { uuid: 'evento-2' }]);

    await componente.ngOnInit();

    expect(migracionOffline.listarPorHabitante).toHaveBeenCalledWith('habitante-uuid-1');
    expect(componente.eventosCapturados()).toBe(2);
  });

  it('no guarda si falta un campo requerido (formulario inválido)', async () => {
    const { componente, migracionOffline } = crearComponente();
    await componente.ngOnInit();

    await componente.guardar();

    expect(migracionOffline.guardar).not.toHaveBeenCalled();
  });

  it('guarda el evento con un uuid propio (no reutiliza el uuid del habitante) y regresa al hub con mensaje de éxito', async () => {
    const { componente, migracionOffline, syncService, router } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.patchValue({
      direccion: DireccionMigratoria.SALIDA,
      fechaMovimiento: '2026-01-15',
      motivoCatalogoItemId: MOTIVO_TRABAJO.id,
    });

    await componente.guardar();

    expect(migracionOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        habitanteUuid: 'habitante-uuid-1',
        periodoCensalId: 5,
        tipoMovimiento: TipoMovimientoMigratorio.INTERNA,
        direccion: DireccionMigratoria.SALIDA,
        fechaMovimiento: '2026-01-15',
        motivoCatalogoItemId: MOTIVO_TRABAJO.id,
        origen: 'local',
      }),
    );
    const payloadGuardado = migracionOffline.guardar.mock.calls[0][0];
    expect(payloadGuardado.uuid).not.toBe('habitante-uuid-1');
    expect(typeof payloadGuardado.uuid).toBe('string');
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'migracion.movimientoGuardadoDescripcion' } },
    );
  });

  it('si falla el guardado, regresa al hub con mensaje de error', async () => {
    const { componente, migracionOffline, router } = crearComponente();
    migracionOffline.guardar.mockRejectedValueOnce(new Error('fallo'));
    await componente.ngOnInit();

    componente.formulario.patchValue({ fechaMovimiento: '2026-01-15', motivoCatalogoItemId: MOTIVO_TRABAJO.id });
    await componente.guardar();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'error', mensaje: 'migracion.errorGuardarMovimiento' } },
    );
  });
});
