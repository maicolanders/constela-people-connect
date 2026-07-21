import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, HabitanteOffline, HogarOffline, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService, HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { HabitanteCambioHogarComponent } from './habitante-cambio-hogar.component';

const habitanteBase: HabitanteOffline = {
  uuid: 'habitante-uuid-1',
  hogarUuid: 'hogar-uuid-origen',
  comunidadId: 3,
  periodoCensalId: 1,
  estado: 'activo',
  nombres: 'Ana',
  apellidos: 'Perez',
  fechaNacimiento: '1990-05-01',
  sexo: 'F',
  origen: 'servidor',
};

const hogarOrigenBase: HogarOffline = {
  uuid: 'hogar-uuid-origen',
  comunidadId: 3,
  periodoCensalId: 1,
  estado: 'activo',
  origen: 'servidor',
};

function crearComponente(
  opciones: { habitante?: HabitanteOffline | undefined; hogarOrigen?: HogarOffline | undefined } = {},
) {
  const habitante = 'habitante' in opciones ? opciones.habitante : habitanteBase;
  const hogarOrigen = 'hogarOrigen' in opciones ? opciones.hogarOrigen : hogarOrigenBase;

  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([{ id: 66, nombre: 'Hijo/a' }]) };
  const habitantesOffline = {
    obtener: jest.fn().mockResolvedValue(habitante),
    guardar: jest.fn().mockResolvedValue(undefined),
  };
  const hogaresOffline = { obtener: jest.fn().mockResolvedValue(hogarOrigen) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: HogaresOfflineService, useValue: hogaresOffline },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(HabitanteCambioHogarComponent);
  return { componente: fixture.componentInstance, habitantesOffline, hogaresOffline, router };
}

describe('HabitanteCambioHogarComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga el habitante y su hogar de origen', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.habitante()?.nombres).toBe('Ana');
    expect(componente.hogarOrigen()?.uuid).toBe('hogar-uuid-origen');
    expect(componente.cargando()).toBe(false);
    expect(componente.error()).toBeNull();
  });

  it('el botón de confirmar permanece deshabilitado hasta elegir hogar destino y parentesco', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    expect(componente.puedeConfirmar()).toBe(false);

    componente.seleccionarHogar({ id: 20, uuid: 'hogar-uuid-destino', direccionReferencia: null, jefeHogarNombre: null });
    expect(componente.puedeConfirmar()).toBe(false);

    componente.parentescoControl.setValue(66);
    expect(componente.puedeConfirmar()).toBe(true);
  });

  it('al confirmar, guarda el habitante con el hogarUuid destino y navega con mensaje de éxito', async () => {
    const { componente, habitantesOffline, router } = crearComponente();
    await componente.ngOnInit();
    componente.seleccionarHogar({ id: 20, uuid: 'hogar-uuid-destino', direccionReferencia: null, jefeHogarNombre: null });
    componente.parentescoControl.setValue(66);

    await componente.confirmar();

    expect(habitantesOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'habitante-uuid-1', hogarUuid: 'hogar-uuid-destino', parentescoCatalogoItemId: 66 }),
      'actualizar',
    );
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-destino', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'poblacion.habitanteReasignadoDescripcion' } },
    );
  });

  it('si falla el guardado, navega con mensaje de error al hogar de origen', async () => {
    const { componente, habitantesOffline, router } = crearComponente();
    habitantesOffline.guardar.mockRejectedValueOnce(new Error('fallo'));
    await componente.ngOnInit();
    componente.seleccionarHogar({ id: 20, uuid: 'hogar-uuid-destino', direccionReferencia: null, jefeHogarNombre: null });
    componente.parentescoControl.setValue(66);

    await componente.confirmar();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-origen', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'error', mensaje: 'poblacion.errorCambiarHogar' } },
    );
  });

  it('si el habitante no existe en la caché local, muestra error y no continúa cargando el hogar', async () => {
    const { componente, hogaresOffline } = crearComponente({ habitante: undefined });

    await componente.ngOnInit();

    expect(componente.error()).toBe('poblacion.habitanteNoEncontrado');
    expect(componente.cargando()).toBe(false);
    expect(hogaresOffline.obtener).not.toHaveBeenCalled();
  });
});
