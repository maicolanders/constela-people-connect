import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { EconomiaOfflineService } from '@censo/web-economia-data-access';
import { EconomiaFormComponent } from './economia-form.component';

const CONDICION_OCUPADO = { id: 1, codigo: 'ocupado', nombre: 'Ocupado', padreId: null, orden: 0 };
const CONDICION_DESEMPLEADO = { id: 2, codigo: 'desempleado', nombre: 'Desempleado', padreId: null, orden: 1 };
const OCUPACION_ARTESANIA = { id: 10, codigo: 'artesania', nombre: 'Artesanía', padreId: null, orden: 0 };

function crearComponente() {
  const economiaOffline = { guardar: jest.fn().mockResolvedValue(undefined) };
  const catalogoOffline = {
    obtenerItems: jest.fn().mockImplementation((tipoCodigo: string) => {
      if (tipoCodigo === 'condicion_actividad') {
        return Promise.resolve([CONDICION_OCUPADO, CONDICION_DESEMPLEADO]);
      }
      if (tipoCodigo === 'ocupacion') {
        return Promise.resolve([OCUPACION_ARTESANIA]);
      }
      return Promise.resolve([]);
    }),
  };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: EconomiaOfflineService, useValue: economiaOffline },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: SyncService, useValue: syncService },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: 'habitante-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(EconomiaFormComponent);
  return { componente: fixture.componentInstance, economiaOffline, syncService, router };
}

describe('EconomiaFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('el tipo de ocupación solo aparece habilitado si la condición seleccionada es "ocupado"', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.onCondicionChange(String(CONDICION_DESEMPLEADO.id));
    expect(componente.esOcupado()).toBe(false);

    componente.onCondicionChange(String(CONDICION_OCUPADO.id));
    expect(componente.esOcupado()).toBe(true);
  });

  it('no guarda si falta la condición de actividad (formulario inválido)', async () => {
    const { componente, economiaOffline } = crearComponente();
    await componente.ngOnInit();

    await componente.guardar();

    expect(economiaOffline.guardar).not.toHaveBeenCalled();
  });

  it('guarda con el tipo de ocupación cuando la condición es "ocupado"', async () => {
    const { componente, economiaOffline, syncService, router } = crearComponente();
    await componente.ngOnInit();

    componente.onCondicionChange(String(CONDICION_OCUPADO.id));
    componente.formulario.patchValue({ ocupacionCatalogoItemId: OCUPACION_ARTESANIA.id, ingresoMensual: 500000 });

    await componente.guardar();

    expect(economiaOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({
        uuid: 'habitante-uuid-1',
        habitanteUuid: 'habitante-uuid-1',
        condicionActividadCatalogoItemId: CONDICION_OCUPADO.id,
        ocupacionCatalogoItemId: OCUPACION_ARTESANIA.id,
        ingresoMensual: 500000,
        origen: 'local',
      }),
    );
    expect(syncService.sincronizar).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/poblacion/habitantes']);
  });

  it('descarta el tipo de ocupación si la condición cambia a "desempleado" después de haberlo seleccionado', async () => {
    const { componente, economiaOffline } = crearComponente();
    await componente.ngOnInit();

    componente.onCondicionChange(String(CONDICION_OCUPADO.id));
    componente.formulario.patchValue({ ocupacionCatalogoItemId: OCUPACION_ARTESANIA.id });
    componente.onCondicionChange(String(CONDICION_DESEMPLEADO.id));

    await componente.guardar();

    expect(economiaOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ condicionActividadCatalogoItemId: CONDICION_DESEMPLEADO.id, ocupacionCatalogoItemId: null }),
    );
  });
});
