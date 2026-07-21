import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService, HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { ViviendaOfflineService } from '@censo/web-vivienda-data-access';
import { EstadoHabitante, EstadoServicio } from '@censo/shared-data-access';
import { ViviendaFormComponent } from './vivienda-form.component';

const TIPO_SERVICIO_AGUA = { id: 1, codigo: 'agua_potable', nombre: 'Agua potable', padreId: null, orden: 0 };
const TIPO_SERVICIO_CONECTIVIDAD = { id: 2, codigo: 'conectividad', nombre: 'Conectividad', padreId: null, orden: 1 };

function crearComponente(habitantesActivos: number) {
  const hogaresOffline = { obtener: jest.fn().mockResolvedValue({ uuid: 'hogar-uuid-1', comunidadId: 3 }) };
  const habitantesOffline = {
    listar: jest.fn().mockResolvedValue(
      Array.from({ length: habitantesActivos }, (_, i) => ({
        uuid: `habitante-${i}`,
        hogarUuid: 'hogar-uuid-1',
        estado: EstadoHabitante.ACTIVO,
      })),
    ),
  };
  const viviendaOffline = { guardar: jest.fn().mockResolvedValue(undefined) };
  const catalogoOffline = {
    obtenerItems: jest.fn().mockImplementation((tipoCodigo: string) => {
      if (tipoCodigo === 'tipo_servicio_vivienda') {
        return Promise.resolve([TIPO_SERVICIO_AGUA, TIPO_SERVICIO_CONECTIVIDAD]);
      }
      if (tipoCodigo === 'fuente_agua') {
        return Promise.resolve([{ id: 30, codigo: 'acueducto', nombre: 'Acueducto', padreId: null, orden: 0 }]);
      }
      return Promise.resolve([]);
    }),
  };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HogaresOfflineService, useValue: hogaresOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: ViviendaOfflineService, useValue: viviendaOffline },
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

  const fixture = TestBed.createComponent(ViviendaFormComponent);
  return { componente: fixture.componentInstance, viviendaOffline, syncService, router };
}

describe('ViviendaFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('crea un control de servicio por cada tipo de servicio del catálogo', async () => {
    const { componente } = crearComponente(2);

    await componente.ngOnInit();

    expect(componente.serviciosFormArray.length).toBe(2);
    expect(componente.tiposServicio()).toEqual([TIPO_SERVICIO_AGUA, TIPO_SERVICIO_CONECTIVIDAD]);
  });

  it('calcula el hacinamiento en vivo contra los habitantes ya capturados localmente del hogar', async () => {
    const { componente } = crearComponente(6);
    await componente.ngOnInit();

    componente.formulario.patchValue({ numeroDormitorios: 2 });
    componente.actualizarHacinamiento();

    expect(componente.hacinamientoEnVivo()).toBe(3);
  });

  it('no calcula hacinamiento si no hay dormitorios válidos', async () => {
    const { componente } = crearComponente(6);
    await componente.ngOnInit();

    componente.formulario.patchValue({ numeroDormitorios: 0 });
    componente.actualizarHacinamiento();

    expect(componente.hacinamientoEnVivo()).toBeNull();
  });

  it('guarda en el outbox local con hogarUuid, comunidadId y los servicios capturados', async () => {
    const { componente, viviendaOffline, syncService, router } = crearComponente(2);
    await componente.ngOnInit();

    componente.formulario.patchValue({
      tipoViviendaCatalogoItemId: 5,
      materialParedCatalogoItemId: 6,
      materialPisoCatalogoItemId: 7,
      materialTechoCatalogoItemId: 8,
      numeroDormitorios: 2,
    });
    componente.serviciosFormArray.at(0).patchValue({ estado: EstadoServicio.SI, fuenteCatalogoItemId: 30 });

    await componente.guardar();

    expect(viviendaOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'hogar-uuid-1',
        hogarUuid: 'hogar-uuid-1',
        comunidadId: 3,
        numeroDormitorios: 2,
        servicios: expect.arrayContaining([
          expect.objectContaining({ tipoServicioCatalogoItemId: 1, estado: EstadoServicio.SI, fuenteCatalogoItemId: 30 }),
        ]),
      }),
    );
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'vivienda.viviendaGuardadaDescripcion' } },
    );
  });

  it('no guarda si el formulario es inválido (faltan campos requeridos)', async () => {
    const { componente, viviendaOffline } = crearComponente(2);
    await componente.ngOnInit();

    await componente.guardar();

    expect(viviendaOffline.guardar).not.toHaveBeenCalled();
  });
});
