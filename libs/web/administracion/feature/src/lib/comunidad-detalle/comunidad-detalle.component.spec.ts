import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { ComunidadDetalleComponent } from './comunidad-detalle.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({ id: '4' }) } };

const COMUNIDAD = { id: 4, nombre: 'Guambiano', codigo: 'guambiano', activa: true };
const HOGARES = [{ id: 10, uuid: 'h-1', estado: 'activo', jefeHogarId: 101, direccionReferencia: 'Vereda X' }];
const HABITANTES = [
  { id: 101, hogarId: 10, nombres: 'Ana', apellidos: 'Perez', estado: 'activo', sexo: 'F', fechaNacimiento: '1990-01-01' },
  { id: 102, hogarId: 10, nombres: 'Luis', apellidos: 'Perez', estado: 'activo', sexo: 'M', fechaNacimiento: '2015-01-01' },
];

function crearComponente() {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/comunidades/4') return of(COMUNIDAD);
      if (url === '/api/poblacion/hogares') return of(HOGARES);
      if (url === '/api/poblacion/habitantes') return of(HABITANTES);
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

  const fixture = TestBed.createComponent(ComunidadDetalleComponent);
  return { componente: fixture.componentInstance, http };
}

describe('ComunidadDetalleComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga la comunidad, sus hogares y habitantes', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.comunidad()).toEqual(COMUNIDAD);
    expect(componente.hogares()).toHaveLength(1);
    expect(componente.habitantesDeHogar(10)).toHaveLength(2);
  });

  it('muestra error si falla la carga', async () => {
    const { componente, http } = crearComponente();
    http.get.mockImplementation(() => throwError(() => new Error('fallo')));

    await componente.ngOnInit();

    expect(componente.error()).toBe('administracion.errorCargarComunidad');
  });
});
