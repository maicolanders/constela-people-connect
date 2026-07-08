import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { NucleoFamiliarComponent } from './nucleo-familiar.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({ id: '10' }) } };

const NUCLEO = {
  hogarId: 10,
  miembros: [
    { habitanteId: 101, nombres: 'Ana', apellidos: 'Perez', estado: 'activo', esJefeHogar: true, parentescoCodigo: null, parentescoNombre: null },
    {
      habitanteId: 102,
      nombres: 'Luis',
      apellidos: 'Perez',
      estado: 'activo',
      esJefeHogar: false,
      parentescoCodigo: 'hijo',
      parentescoNombre: 'Hijo/a',
    },
  ],
};

function crearComponente(respuesta: unknown = NUCLEO) {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/poblacion/hogares/10/nucleo-familiar') {
        return respuesta instanceof Error ? throwError(() => respuesta) : of(respuesta);
      }
      return of(null);
    }),
  };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HttpClient, useValue: http },
      { provide: ActivatedRoute, useValue: ACTIVATED_ROUTE_STUB },
    ],
  });

  const fixture = TestBed.createComponent(NucleoFamiliarComponent);
  return { componente: fixture.componentInstance };
}

describe('NucleoFamiliarComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('separa al jefe de hogar de los demás miembros', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.jefeHogar()?.habitanteId).toBe(101);
    expect(componente.otrosMiembros().map((m) => m.habitanteId)).toEqual([102]);
  });

  it('muestra error si falla la carga', async () => {
    const { componente } = crearComponente(new Error('fallo'));

    await componente.ngOnInit();

    expect(componente.error()).toBe('administracion.errorCargarNucleoFamiliar');
  });
});
