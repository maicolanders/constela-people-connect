import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { MiEconomiaComponent } from './mi-economia.component';

const CONDICION_OCUPADO = { id: 1, codigo: 'ocupado', nombre: 'Ocupado' };
const CONDICION_DESEMPLEADO = { id: 2, codigo: 'desempleado', nombre: 'Desempleado' };
const OCUPACION_ARTESANIA = { id: 10, codigo: 'artesania', nombre: 'Artesanía' };

function crearComponente(registroExistente: unknown | null = null) {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/catalogos/condicion_actividad/items') return of([CONDICION_OCUPADO, CONDICION_DESEMPLEADO]);
      if (url === '/api/catalogos/ocupacion/items') return of([OCUPACION_ARTESANIA]);
      if (url === '/api/economia/mi-registro') {
        return registroExistente ? of(registroExistente) : throwError(() => new HttpErrorResponse({ status: 404 }));
      }
      return of(null);
    }),
    post: jest.fn().mockReturnValue(of({})),
    patch: jest.fn().mockReturnValue(of({})),
  };

  TestBed.configureTestingModule({
    providers: [provideTranslateService(), { provide: HttpClient, useValue: http }],
  });

  const fixture = TestBed.createComponent(MiEconomiaComponent);
  return { componente: fixture.componentInstance, http };
}

describe('MiEconomiaComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('sin registro previo (404): guardar crea (POST) en vez de actualizar', async () => {
    const { componente, http } = crearComponente(null);
    await componente.ngOnInit();

    componente.formulario.patchValue({ condicionActividadCatalogoItemId: CONDICION_DESEMPLEADO.id });
    await componente.guardar();

    expect(http.post).toHaveBeenCalledWith('/api/economia/mi-registro', expect.objectContaining({ condicionActividadCatalogoItemId: 2 }));
    expect(http.patch).not.toHaveBeenCalled();
  });

  it('con registro existente: precarga el formulario y guardar actualiza (PATCH)', async () => {
    const { componente, http } = crearComponente({
      condicionActividadCatalogoItemId: CONDICION_OCUPADO.id,
      ocupacionCatalogoItemId: OCUPACION_ARTESANIA.id,
      ingresoMensual: '500000.00',
    });
    await componente.ngOnInit();

    expect(componente.formulario.value.condicionActividadCatalogoItemId).toBe(1);
    expect(componente.formulario.value.ingresoMensual).toBe(500000);

    await componente.guardar();

    expect(http.patch).toHaveBeenCalledWith('/api/economia/mi-registro', expect.any(Object));
    expect(http.post).not.toHaveBeenCalled();
  });

  it('esOcupado solo es true cuando la condición seleccionada tiene código "ocupado"', async () => {
    const { componente } = crearComponente(null);
    await componente.ngOnInit();

    componente.onCondicionChange(String(CONDICION_DESEMPLEADO.id));
    expect(componente.esOcupado()).toBe(false);

    componente.onCondicionChange(String(CONDICION_OCUPADO.id));
    expect(componente.esOcupado()).toBe(true);
  });

  it('limpia ocupacionCatalogoItemId al cambiar a una condición que no es "ocupado"', async () => {
    const { componente } = crearComponente({
      condicionActividadCatalogoItemId: CONDICION_OCUPADO.id,
      ocupacionCatalogoItemId: OCUPACION_ARTESANIA.id,
      ingresoMensual: null,
    });
    await componente.ngOnInit();
    expect(componente.formulario.value.ocupacionCatalogoItemId).toBe(OCUPACION_ARTESANIA.id);

    componente.onCondicionChange(String(CONDICION_DESEMPLEADO.id));

    expect(componente.formulario.value.ocupacionCatalogoItemId).toBeNull();
  });
});
