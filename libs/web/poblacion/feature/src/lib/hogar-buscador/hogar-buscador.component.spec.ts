import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { HogarBuscadorComponent } from './hogar-buscador.component';

function crearComponente(getImpl: (url: string) => unknown) {
  const http = { get: jest.fn(getImpl) };

  TestBed.configureTestingModule({
    providers: [provideTranslateService(), { provide: HttpClient, useValue: http }],
  });

  const fixture = TestBed.createComponent(HogarBuscadorComponent);
  const componente = fixture.componentInstance;
  componente.comunidadId = 3;
  return { componente, http };
}

describe('HogarBuscadorComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('busca hogares activos de la comunidad y resuelve el nombre del jefe de hogar cruzando con habitantes', async () => {
    const { componente, http } = crearComponente((url: string) => {
      if (url === '/api/poblacion/hogares') {
        return of([{ id: 20, uuid: 'hogar-uuid-2', estado: 'activo', jefeHogarId: 5, direccionReferencia: 'Vereda X' }]);
      }
      return of([{ id: 5, nombres: 'Luis', apellidos: 'Gomez' }]);
    });

    await componente.buscar();

    expect(componente.resultados()).toEqual([
      { id: 20, uuid: 'hogar-uuid-2', direccionReferencia: 'Vereda X', jefeHogarNombre: 'Luis Gomez' },
    ]);
    expect(http.get).toHaveBeenCalledWith(
      '/api/poblacion/hogares',
      expect.objectContaining({ params: expect.objectContaining({ comunidadId: 3, estado: 'activo' }) }),
    );
  });

  it('excluye el hogar de origen de los resultados', async () => {
    const { componente } = crearComponente((url: string) => {
      if (url === '/api/poblacion/hogares') {
        return of([
          { id: 10, uuid: 'hogar-origen', estado: 'activo', jefeHogarId: null, direccionReferencia: 'A' },
          { id: 20, uuid: 'hogar-destino', estado: 'activo', jefeHogarId: null, direccionReferencia: 'B' },
        ]);
      }
      return of([]);
    });
    componente.excluirHogarUuid = 'hogar-origen';

    await componente.buscar();

    expect(componente.resultados()?.map((resultado) => resultado.uuid)).toEqual(['hogar-destino']);
  });

  it('emite hogarSeleccionado al elegir un resultado', () => {
    const { componente } = crearComponente(() => of([]));
    const resultado = { id: 1, uuid: 'hogar-uuid-1', direccionReferencia: null, jefeHogarNombre: null };
    const emitido = jest.fn();
    componente.hogarSeleccionado.subscribe(emitido);

    componente.seleccionar(resultado);

    expect(emitido).toHaveBeenCalledWith(resultado);
  });

  it('muestra una lista vacía cuando la búsqueda no encuentra hogares', async () => {
    const { componente } = crearComponente(() => of([]));

    await componente.buscar();

    expect(componente.resultados()).toEqual([]);
  });

  it('maneja errores de red mostrando un mensaje y limpiando resultados', async () => {
    const { componente } = crearComponente(() => throwError(() => new Error('sin conexión')));

    await componente.buscar();

    expect(componente.error()).toBe('poblacion.errorBuscarHogar');
    expect(componente.resultados()).toBeNull();
  });
});
