import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService, UbicacionGeograficaCache } from '@censo/web-shared-data-access';
import { HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { HogarUbicacionOfflineService, UbicacionesGeograficasOfflineService } from '@censo/web-georreferenciacion-data-access';
import { ClasificacionUbicacion } from '@censo/shared-data-access';
import { HogarUbicacionFormComponent } from './hogar-ubicacion-form.component';

const RAIZ: UbicacionGeograficaCache = { id: 1, nivelGeograficoCatalogoItemId: 10, padreId: null, nombre: 'Colombia', codigo: 'CO' };
const HIJO: UbicacionGeograficaCache = { id: 2, nivelGeograficoCatalogoItemId: 11, padreId: 1, nombre: 'Cauca', codigo: '19' };

function crearComponente() {
  const hogaresOffline = { obtener: jest.fn().mockResolvedValue({ uuid: 'hogar-uuid-1', comunidadId: 3 }) };
  const hogarUbicacionOffline = { guardar: jest.fn().mockResolvedValue(undefined), obtenerPorHogar: jest.fn() };
  const ubicacionesGeograficasOffline = {
    listarHijos: jest.fn().mockImplementation((padreId?: number) =>
      Promise.resolve(padreId === undefined ? [RAIZ] : padreId === 1 ? [HIJO] : []),
    ),
  };
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([]) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HogaresOfflineService, useValue: hogaresOffline },
      { provide: HogarUbicacionOfflineService, useValue: hogarUbicacionOffline },
      { provide: UbicacionesGeograficasOfflineService, useValue: ubicacionesGeograficasOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ hogarUuid: 'hogar-uuid-1' }),
            queryParamMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }),
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(HogarUbicacionFormComponent);
  return { componente: fixture.componentInstance, hogarUbicacionOffline, ubicacionesGeograficasOffline, syncService, router };
}

describe('HogarUbicacionFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga las raíces de la jerarquía geográfica al iniciar', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.niveles()).toEqual([[RAIZ]]);
  });

  it('al seleccionar un nodo, agrega el siguiente nivel con sus hijos (cascada)', async () => {
    const { componente, ubicacionesGeograficasOffline } = crearComponente();
    await componente.ngOnInit();

    await componente.seleccionarNodo(0, String(RAIZ.id));

    expect(ubicacionesGeograficasOffline.listarHijos).toHaveBeenCalledWith(1);
    expect(componente.niveles()).toEqual([[RAIZ], [HIJO]]);
  });

  it('no guarda si no se ha seleccionado ningún nodo de la jerarquía (ubicacionGeograficaId ausente)', async () => {
    const { componente, hogarUbicacionOffline } = crearComponente();
    await componente.ngOnInit();
    componente.formulario.patchValue({ latitud: 2.44, longitud: -76.6, capturadoEn: '2026-07-06T10:00:00.000Z' });

    await componente.guardar();

    expect(hogarUbicacionOffline.guardar).not.toHaveBeenCalled();
  });

  it('guarda en el outbox local con hogarUuid y el nodo geográfico hoja seleccionado', async () => {
    const { componente, hogarUbicacionOffline, syncService, router } = crearComponente();
    await componente.ngOnInit();
    await componente.seleccionarNodo(0, String(RAIZ.id));
    await componente.seleccionarNodo(1, String(HIJO.id));
    componente.formulario.patchValue({
      latitud: 2.44,
      longitud: -76.6,
      capturadoEn: '2026-07-06T10:00:00.000Z',
      clasificacion: ClasificacionUbicacion.RURAL,
    });

    await componente.guardar();

    expect(hogarUbicacionOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'hogar-uuid-1',
        hogarUuid: 'hogar-uuid-1',
        comunidadId: 3,
        ubicacionGeograficaId: 2,
        latitud: 2.44,
        longitud: -76.6,
        origen: 'local',
      }),
    );
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'georreferenciacion.ubicacionGuardadaDescripcion' } },
    );
  });
});
