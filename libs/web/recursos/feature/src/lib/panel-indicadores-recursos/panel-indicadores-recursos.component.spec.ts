import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { PanelIndicadoresRecursosComponent } from './panel-indicadores-recursos.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };

const PERIODO_1 = { id: 1, nombre: 'Periodo 2026' };

const RESULTADO_API = {
  periodoCensalId: 1,
  comunidades: [
    { comunidadId: 4, comunidadNombre: 'Guambiano', poblacionTotal: 50, tasaNbi: 20, coberturaEducativa: 90, tasaVulnerabilidad: 10, suprimido: false },
    { comunidadId: 5, comunidadNombre: 'Arhuaco', poblacionTotal: 200, tasaNbi: 5, coberturaEducativa: 70, tasaVulnerabilidad: 30, suprimido: false },
  ],
};

function crearComponente() {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/periodos-censales') return of([PERIODO_1]);
      if (url === '/api/recursos/indicadores') return of(RESULTADO_API);
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

  const fixture = TestBed.createComponent(PanelIndicadoresRecursosComponent);
  return { componente: fixture.componentInstance, http };
}

describe('PanelIndicadoresRecursosComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga periodos e indicadores al iniciar', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.periodoCensalId()).toBe(PERIODO_1.id);
    expect(componente.comunidadesOrdenadas()).toHaveLength(2);
  });

  it('ordena por nombre de comunidad ascendente por defecto', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    expect(componente.comunidadesOrdenadas().map((c) => c.comunidadNombre)).toEqual(['Arhuaco', 'Guambiano']);
  });

  it('ordenarPor invierte la dirección si se pulsa la misma columna dos veces', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.ordenarPor('poblacionTotal');
    expect(componente.comunidadesOrdenadas().map((c) => c.comunidadId)).toEqual([4, 5]);

    componente.ordenarPor('poblacionTotal');
    expect(componente.comunidadesOrdenadas().map((c) => c.comunidadId)).toEqual([5, 4]);
  });

  it('cambia de columna de orden y reinicia a ascendente', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.ordenarPor('poblacionTotal');
    componente.ordenarPor('poblacionTotal');
    componente.ordenarPor('tasaNbi');

    expect(componente.comunidadesOrdenadas().map((c) => c.comunidadId)).toEqual([5, 4]);
  });

  it('muestra error si falla la carga del panel', async () => {
    const http = {
      get: jest.fn().mockImplementation((url: string) => {
        if (url === '/api/periodos-censales') return of([PERIODO_1]);
        throw new Error('fallo de red');
      }),
    };
    TestBed.configureTestingModule({
      providers: [
      provideTranslateService(),
      { provide: HttpClient, useValue: http },
      { provide: ActivatedRoute, useValue: ACTIVATED_ROUTE_STUB },
    ],
    });
    const fixture = TestBed.createComponent(PanelIndicadoresRecursosComponent);
    const componente = fixture.componentInstance;

    await componente.ngOnInit();

    expect(componente.error()).toBe('recursos.errorCargarPanel');
  });
});
