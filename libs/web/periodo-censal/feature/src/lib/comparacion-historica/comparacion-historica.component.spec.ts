import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { ComparacionHistoricaComponent } from './comparacion-historica.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };

const PERIODOS = [
  { id: 1, nombre: 'Censo 2020' },
  { id: 2, nombre: 'Censo 2026' },
];

const RESULTADO = [
  {
    comunidadId: 4,
    comunidadNombre: 'Guambiano',
    puntos: [
      { periodoCensalId: 1, periodoNombre: 'Censo 2020', poblacionTotal: 40, coberturaServiciosPromedio: 50, suprimido: false },
      { periodoCensalId: 2, periodoNombre: 'Censo 2026', poblacionTotal: 60, coberturaServiciosPromedio: 80, suprimido: false },
    ],
  },
];

function crearComponente() {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/periodos-censales') return of(PERIODOS);
      if (url === '/api/periodos-censales/comparacion-historica') return of(RESULTADO);
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

  const fixture = TestBed.createComponent(ComparacionHistoricaComponent);
  return { componente: fixture.componentInstance, http };
}

describe('ComparacionHistoricaComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('preselecciona los dos primeros periodos y compara automáticamente al iniciar', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.seleccionados()).toEqual([1, 2]);
    expect(componente.resultado()).toEqual(RESULTADO);
  });

  it('puedeComparar es falso con menos de 2 periodos seleccionados', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    componente.alternarSeleccion(2, false);

    expect(componente.seleccionados()).toEqual([1]);
    expect(componente.puedeComparar()).toBe(false);
  });

  it('genera puntos de una polilínea proporcional a la población', async () => {
    const { componente } = crearComponente();
    await componente.ngOnInit();

    const puntos = componente.puntosGrafico(RESULTADO[0]);

    expect(puntos).toBe('0,20 240,0');
  });

  it('muestra error si falla la comparación', async () => {
    const { componente, http } = crearComponente();
    http.get.mockImplementation((url: string) => {
      if (url === '/api/periodos-censales') return of(PERIODOS);
      return throwError(() => new Error('fallo'));
    });

    await componente.ngOnInit();

    expect(componente.error()).toBe('periodoCensal.errorComparar');
  });
});
