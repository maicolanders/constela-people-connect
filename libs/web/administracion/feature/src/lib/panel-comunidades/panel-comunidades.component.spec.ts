import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { PanelComunidadesComponent } from './panel-comunidades.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };

const COMUNIDADES = [
  { id: 4, nombre: 'Guambiano', codigo: 'guambiano', activa: true },
  { id: 5, nombre: 'Arhuaco', codigo: 'arhuaco', activa: false },
];

function crearComponente() {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/comunidades') return of(COMUNIDADES);
      if (url === '/api/poblacion/habitantes/conteo') return of({ total: 10 });
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

  const fixture = TestBed.createComponent(PanelComunidadesComponent);
  return { componente: fixture.componentInstance, http };
}

describe('PanelComunidadesComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga las comunidades con su conteo de habitantes', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.comunidades()).toEqual([
      { id: 4, nombre: 'Guambiano', codigo: 'guambiano', activa: true, totalHabitantes: 10 },
      { id: 5, nombre: 'Arhuaco', codigo: 'arhuaco', activa: false, totalHabitantes: 10 },
    ]);
  });

  it('muestra error si falla la carga', async () => {
    const { componente, http } = crearComponente();
    http.get.mockImplementation(() => throwError(() => new Error('fallo')));

    await componente.ngOnInit();

    expect(componente.error()).toBe('administracion.errorCargarComunidades');
  });
});
