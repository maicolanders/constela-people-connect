import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { MiHogarComponent } from './mi-hogar.component';

function crearComponente(respuesta: unknown, falla = false) {
  const http = {
    get: jest.fn().mockReturnValue(falla ? throwError(() => new Error('fallo')) : of(respuesta)),
  };

  TestBed.configureTestingModule({
    providers: [provideTranslateService(), { provide: HttpClient, useValue: http }],
  });

  const fixture = TestBed.createComponent(MiHogarComponent);
  return { componente: fixture.componentInstance, http };
}

describe('MiHogarComponent (Fase 14, autogestión)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('consulta el núcleo familiar propio sin ningún hogarId en la URL', async () => {
    const { componente, http } = crearComponente({ hogarId: 10, miembros: [] });

    await componente.ngOnInit();

    expect(http.get).toHaveBeenCalledWith('/api/poblacion/habitantes/mi-hogar/nucleo-familiar');
    expect(componente.cargando()).toBe(false);
  });

  it('separa al jefe de hogar de los demás miembros', async () => {
    const { componente } = crearComponente({
      hogarId: 10,
      miembros: [
        { habitanteId: 1, nombres: 'Ana', apellidos: 'Perez', estado: 'activo', esJefeHogar: true, parentescoCodigo: null, parentescoNombre: null },
        { habitanteId: 2, nombres: 'Luis', apellidos: 'Perez', estado: 'activo', esJefeHogar: false, parentescoCodigo: 'hijo', parentescoNombre: 'Hijo/a' },
      ],
    });

    await componente.ngOnInit();

    expect(componente.jefeHogar()?.habitanteId).toBe(1);
    expect(componente.otrosMiembros()).toEqual([
      expect.objectContaining({ habitanteId: 2, parentescoNombre: 'Hijo/a' }),
    ]);
  });

  it('muestra error si falla la consulta', async () => {
    const { componente } = crearComponente(null, true);

    await componente.ngOnInit();

    expect(componente.error()).toBe('autogestion.errorCargarMiHogar');
  });
});
