import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { EtniaVulnerabilidadOfflineService } from '@censo/web-etnia-vulnerabilidad-data-access';
import { EtniaVulnerabilidadFormComponent } from './etnia-vulnerabilidad-form.component';

const ETNIA_NASA = { id: 1, codigo: 'nasa', nombre: 'Nasa', padreId: null, orden: 0 };
const LENGUA_NASA_YUWE = { id: 2, codigo: 'nasa_yuwe', nombre: 'Nasa Yuwe', padreId: null, orden: 0 };
const CONDICION_DISCAPACIDAD = { id: 10, codigo: 'discapacidad_fisica', nombre: 'Discapacidad física', padreId: null, orden: 0 };
const CONDICION_VICTIMA = { id: 11, codigo: 'victima_conflicto_armado', nombre: 'Víctima de conflicto armado', padreId: null, orden: 1 };

function crearComponente(existente: unknown = undefined) {
  const etniaVulnerabilidadOffline = {
    obtenerPorHabitante: jest.fn().mockResolvedValue(existente),
    guardar: jest.fn().mockResolvedValue(undefined),
  };
  const catalogoOffline = {
    obtenerItems: jest.fn().mockImplementation((tipoCodigo: string) => {
      if (tipoCodigo === 'etnia') return Promise.resolve([ETNIA_NASA]);
      if (tipoCodigo === 'lengua') return Promise.resolve([LENGUA_NASA_YUWE]);
      if (tipoCodigo === 'condicion_vulnerabilidad') return Promise.resolve([CONDICION_DISCAPACIDAD, CONDICION_VICTIMA]);
      return Promise.resolve([]);
    }),
  };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };
  const http = { get: jest.fn().mockReturnValue(of([])) };
  const habitantesOffline = { obtener: jest.fn().mockResolvedValue({ hogarUuid: 'hogar-uuid-1' }) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: EtniaVulnerabilidadOfflineService, useValue: etniaVulnerabilidadOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      { provide: HttpClient, useValue: http },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(EtniaVulnerabilidadFormComponent);
  return { componente: fixture.componentInstance, etniaVulnerabilidadOffline, syncService, router };
}

describe('EtniaVulnerabilidadFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('no guarda si falta la etnia (formulario inválido)', async () => {
    const { componente, etniaVulnerabilidadOffline } = crearComponente();
    await componente.ngOnInit();

    await componente.guardar();

    expect(etniaVulnerabilidadOffline.guardar).not.toHaveBeenCalled();
  });

  it('alternarCondicion agrega y quita códigos del conjunto seleccionado', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.alternarCondicion(CONDICION_DISCAPACIDAD.id, true);
    expect(componente.condicionesSeleccionadas().has(CONDICION_DISCAPACIDAD.id)).toBe(true);

    componente.alternarCondicion(CONDICION_DISCAPACIDAD.id, false);
    expect(componente.condicionesSeleccionadas().has(CONDICION_DISCAPACIDAD.id)).toBe(false);
  });

  it('guarda en el outbox local con el uuid del habitante y las condiciones seleccionadas', async () => {
    const { componente, etniaVulnerabilidadOffline, syncService, router } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.patchValue({ etniaCatalogoItemId: ETNIA_NASA.id, lenguaMaternaCatalogoItemId: LENGUA_NASA_YUWE.id });
    componente.alternarCondicion(CONDICION_DISCAPACIDAD.id, true);
    componente.alternarCondicion(CONDICION_VICTIMA.id, true);

    await componente.guardar();

    expect(etniaVulnerabilidadOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'habitante-uuid-1',
        habitanteUuid: 'habitante-uuid-1',
        etniaCatalogoItemId: ETNIA_NASA.id,
        lenguaMaternaCatalogoItemId: LENGUA_NASA_YUWE.id,
        condicionesVulnerabilidad: expect.arrayContaining([
          { condicionVulnerabilidadCatalogoItemId: CONDICION_DISCAPACIDAD.id },
          { condicionVulnerabilidadCatalogoItemId: CONDICION_VICTIMA.id },
        ]),
        origen: 'local',
      }),
    );
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-1', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'etniaVulnerabilidad.identificacionGuardadaDescripcion' } },
    );
  });

  it('precarga el formulario y las condiciones si el habitante ya tiene un registro', async () => {
    const { componente } = crearComponente({
      etniaCatalogoItemId: ETNIA_NASA.id,
      lenguaMaternaCatalogoItemId: LENGUA_NASA_YUWE.id,
      resguardoUbicacionGeograficaId: null,
      condicionesVulnerabilidad: [{ condicionVulnerabilidadCatalogoItemId: CONDICION_DISCAPACIDAD.id }],
    });

    await componente.ngOnInit();

    expect(componente.formulario.value.etniaCatalogoItemId).toBe(ETNIA_NASA.id);
    expect(componente.condicionesSeleccionadas().has(CONDICION_DISCAPACIDAD.id)).toBe(true);
  });
});
