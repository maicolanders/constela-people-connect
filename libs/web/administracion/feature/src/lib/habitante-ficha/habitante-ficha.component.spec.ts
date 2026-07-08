import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { HabitanteFichaComponent } from './habitante-ficha.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({ id: '101' }) } };

const HABITANTE = {
  id: 101,
  hogarId: 10,
  comunidadId: 4,
  nombres: 'Ana',
  apellidos: 'Perez',
  estado: 'activo',
  sexo: 'F',
  fechaNacimiento: '1990-01-01',
  edadEstimada: false,
};

function crearComponente(overrides: { educacion?: unknown; ocupacion?: unknown; etnia?: unknown; vivienda?: unknown } = {}) {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/poblacion/habitantes/101') return of(HABITANTE);
      if (url === '/api/vivienda/hogares/10') {
        return overrides.vivienda ? of(overrides.vivienda) : throwError(() => new Error('404'));
      }
      if (url === '/api/educacion/habitantes/101') {
        return overrides.educacion ? of(overrides.educacion) : throwError(() => new Error('404'));
      }
      if (url === '/api/economia/habitantes/101') {
        return overrides.ocupacion ? of(overrides.ocupacion) : throwError(() => new Error('404'));
      }
      if (url === '/api/etnia-vulnerabilidad/habitantes/101') {
        return overrides.etnia ? of(overrides.etnia) : throwError(() => new Error('404'));
      }
      if (url === '/api/migracion/habitantes/101') return of([]);
      if (url.startsWith('/api/catalogos/')) {
        return of([{ id: 1, nombre: 'Nivel X' }]);
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

  const fixture = TestBed.createComponent(HabitanteFichaComponent);
  return { componente: fixture.componentInstance, http };
}

describe('HabitanteFichaComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga el habitante y deja en null las secciones sin registro (404)', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.habitante()).toEqual(HABITANTE);
    expect(componente.vivienda()).toBeNull();
    expect(componente.educacion()).toBeNull();
    expect(componente.ocupacion()).toBeNull();
    expect(componente.etnia()).toBeNull();
    expect(componente.migraciones()).toEqual([]);
  });

  it('resuelve un id de catálogo a su nombre usando los catálogos precargados', async () => {
    const { componente } = crearComponente({ educacion: { alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 1 } });

    await componente.ngOnInit();

    expect(componente.educacion()).toEqual({ alfabetizado: true, asisteEscuela: true, nivelEducativoCatalogoItemId: 1 });
    expect(componente.nombreCatalogo(1)).toBe('Nivel X');
    expect(componente.nombreCatalogo(null)).toBe('—');
    expect(componente.nombreCatalogo(999)).toBe('#999');
  });
});
