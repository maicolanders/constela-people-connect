import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { UbicacionesGeograficasOfflineService } from '@censo/web-georreferenciacion-data-access';
import { PeriodoActualService } from '@censo/web-poblacion-data-access';
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
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([MOTIVO_TRABAJO]) };
  const periodoActual = { obtenerIdAbierto: jest.fn().mockResolvedValue(5) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: MigracionOfflineService, useValue: migracionOffline },
      { provide: UbicacionesGeograficasOfflineService, useValue: ubicacionesGeograficasOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: PeriodoActualService, useValue: periodoActual },
      { provide: SyncService, useValue: syncService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(MigracionFormComponent);
  return { componente: fixture.componentInstance, migracionOffline, syncService, periodoActual };
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

  it('guarda el evento con un uuid propio (no reutiliza el uuid del habitante) y no navega fuera del formulario', async () => {
    const { componente, migracionOffline, syncService } = crearComponente();
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
    expect(componente.eventosCapturados()).toBe(1);
  });

  it('permite capturar un segundo evento después de guardar el primero (formulario se reinicia, no se navega)', async () => {
    const { componente, migracionOffline } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.patchValue({ fechaMovimiento: '2026-01-15', motivoCatalogoItemId: MOTIVO_TRABAJO.id });
    await componente.guardar();

    expect(componente.formulario.value.fechaMovimiento).toBeNull();
    expect(componente.formulario.value.motivoCatalogoItemId).toBeNull();

    componente.formulario.patchValue({ fechaMovimiento: '2026-02-01', motivoCatalogoItemId: MOTIVO_TRABAJO.id });
    await componente.guardar();

    expect(migracionOffline.guardar).toHaveBeenCalledTimes(2);
    expect(componente.eventosCapturados()).toBe(2);
  });
});
