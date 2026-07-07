import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { EducacionOfflineService } from '@censo/web-educacion-data-access';
import { EducacionFormComponent } from './educacion-form.component';

const NIVEL_PRIMARIA = { id: 5, codigo: 'basica_primaria', nombre: 'Básica primaria', padreId: null, orden: 0 };
const LENGUA_ESPANOL = { id: 1, codigo: 'espanol', nombre: 'Español', padreId: null, orden: 0 };
const LENGUA_NASA = { id: 2, codigo: 'nasa_yuwe', nombre: 'Nasa Yuwe', padreId: null, orden: 1 };

function crearComponente() {
  const educacionOffline = { guardar: jest.fn().mockResolvedValue(undefined) };
  const catalogoOffline = {
    obtenerItems: jest.fn().mockImplementation((tipoCodigo: string) => {
      if (tipoCodigo === 'nivel_educativo') {
        return Promise.resolve([NIVEL_PRIMARIA]);
      }
      if (tipoCodigo === 'lengua') {
        return Promise.resolve([LENGUA_ESPANOL, LENGUA_NASA]);
      }
      return Promise.resolve([]);
    }),
  };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: EducacionOfflineService, useValue: educacionOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(EducacionFormComponent);
  return { componente: fixture.componentInstance, educacionOffline, syncService, router };
}

describe('EducacionFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('agrega una fila de lengua vacía al iniciar', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.lenguasFormArray.length).toBe(1);
    expect(componente.lenguasDisponibles()).toEqual([LENGUA_ESPANOL, LENGUA_NASA]);
  });

  it('agregarLengua/quitarLengua añaden y quitan filas del FormArray', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.agregarLengua();
    expect(componente.lenguasFormArray.length).toBe(2);

    componente.quitarLengua(0);
    expect(componente.lenguasFormArray.length).toBe(1);
  });

  it('no guarda si falta el nivel educativo (formulario inválido)', async () => {
    const { componente, educacionOffline } = crearComponente();
    await componente.ngOnInit();

    await componente.guardar();

    expect(educacionOffline.guardar).not.toHaveBeenCalled();
  });

  it('guarda en el outbox local con habitanteUuid y las lenguas capturadas (omite filas sin lengua seleccionada)', async () => {
    const { componente, educacionOffline, syncService, router } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.patchValue({ alfabetizado: true, nivelEducativoCatalogoItemId: 5, asisteEscuela: true });
    componente.lenguasFormArray.at(0).patchValue({ lenguaCatalogoItemId: 2, esLenguaMaterna: true });
    componente.agregarLengua();

    await componente.guardar();

    expect(educacionOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'habitante-uuid-1',
        habitanteUuid: 'habitante-uuid-1',
        alfabetizado: true,
        nivelEducativoCatalogoItemId: 5,
        asisteEscuela: true,
        lenguas: [{ lenguaCatalogoItemId: 2, esLenguaMaterna: true }],
        origen: 'local',
      }),
    );
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/poblacion/habitantes']);
  });
});
