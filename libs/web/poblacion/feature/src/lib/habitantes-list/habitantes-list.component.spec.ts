import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService, CatalogoOfflineService } from '@censo/web-shared-data-access';
import { HabitantesPullService } from '@censo/web-poblacion-data-access';
import { HabitantesListComponent } from './habitantes-list.component';

function habitante(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    uuid: 'habitante-uuid-1',
    hogarId: 10,
    estado: 'activo',
    nombres: 'Ana',
    apellidos: 'Perez',
    tipoDocumentoId: 5,
    numeroDocumento: '12345',
    fechaNacimiento: '1990-05-01',
    sexo: 'F',
    ...overrides,
  };
}

function crearComponente(getImpl: (url: string, opciones?: { params?: Record<string, unknown> }) => unknown) {
  const authService = {
    obtenerPerfil: jest.fn().mockResolvedValue({ asignaciones: [{ rol: 'censista', comunidadId: 3 }] }),
  };
  const habitantesPull = { actualizar: jest.fn().mockResolvedValue(undefined) };
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([{ id: 5, nombre: 'Cédula' }]) };
  const http = { get: jest.fn(getImpl) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: AuthService, useValue: authService },
      { provide: HabitantesPullService, useValue: habitantesPull },
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: HttpClient, useValue: http },
      { provide: Router, useValue: { navigate: jest.fn().mockResolvedValue(true) } },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
    ],
  });

  const fixture = TestBed.createComponent(HabitantesListComponent);
  return { componente: fixture.componentInstance, http, habitantesPull, authService };
}

describe('HabitantesListComponent — paginación', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga la primera página (limit = tamaño + 1) y detecta que hay más', async () => {
    const paginaCompleta = Array.from({ length: 31 }, (_, i) => habitante({ uuid: `u-${i}`, hogarId: 10 }));
    const { componente, http } = crearComponente((url) => {
      if (url === '/api/poblacion/habitantes') return of(paginaCompleta);
      if (url === '/api/poblacion/hogares') return of([{ id: 10, uuid: 'hogar-uuid-1' }]);
      return of({ total: 500000 });
    });

    await componente.ngOnInit();

    expect(componente.habitantes().length).toBe(30);
    expect(componente.hayMas()).toBe(true);
    expect(componente.total()).toBe(500000);
    expect(http.get).toHaveBeenCalledWith(
      '/api/poblacion/habitantes',
      expect.objectContaining({ params: expect.objectContaining({ comunidadId: 3, limit: 31, offset: 0 }) }),
    );
  });

  it('no dispara habitantesPull.actualizar de forma bloqueante (fire-and-forget)', async () => {
    const { componente, habitantesPull } = crearComponente((url) => {
      if (url === '/api/poblacion/habitantes') return of([]);
      if (url === '/api/poblacion/hogares') return of([]);
      return of({ total: 0 });
    });

    await componente.ngOnInit();

    expect(habitantesPull.actualizar).toHaveBeenCalledWith(3);
  });

  it('cargarMas acumula resultados y avanza el offset', async () => {
    const primeraPagina = Array.from({ length: 31 }, (_, i) => habitante({ uuid: `u-${i}`, hogarId: 10 }));
    const segundaPagina = [habitante({ uuid: 'u-31', hogarId: 10 })];
    const { componente, http } = crearComponente((url, opciones) => {
      if (url === '/api/poblacion/habitantes') {
        const offset = opciones?.params?.['offset'];
        return of(offset === 0 ? primeraPagina : segundaPagina);
      }
      if (url === '/api/poblacion/hogares') return of([{ id: 10, uuid: 'hogar-uuid-1' }]);
      return of({ total: 31 });
    });

    await componente.ngOnInit();
    await componente.cargarMas();

    expect(componente.habitantes().length).toBe(31);
    expect(componente.hayMas()).toBe(false);
    expect(http.get).toHaveBeenCalledWith(
      '/api/poblacion/habitantes',
      expect.objectContaining({ params: expect.objectContaining({ offset: 30 }) }),
    );
  });

  it('resuelve hogarUuid solo para los hogarId de la página actual (acotado, no toda la comunidad)', async () => {
    const pagina = [habitante({ uuid: 'u-1', hogarId: 10 }), habitante({ uuid: 'u-2', hogarId: 20 })];
    const { componente, http } = crearComponente((url) => {
      if (url === '/api/poblacion/habitantes') return of(pagina);
      if (url === '/api/poblacion/hogares') {
        return of([
          { id: 10, uuid: 'hogar-uuid-10' },
          { id: 20, uuid: 'hogar-uuid-20' },
        ]);
      }
      return of({ total: 2 });
    });

    await componente.ngOnInit();

    expect(http.get).toHaveBeenCalledWith(
      '/api/poblacion/hogares',
      expect.objectContaining({ params: expect.objectContaining({ comunidadId: 3, ids: '10,20' }) }),
    );
    expect(componente.hogarUuidDe(pagina[0] as never)).toBe('hogar-uuid-10');
    expect(componente.hogarUuidDe(pagina[1] as never)).toBe('hogar-uuid-20');
  });

  it('buscar() envía tipoDocumentoId y numeroDocumento como filtros y reinicia la paginación', async () => {
    const { componente, http } = crearComponente((url) => {
      if (url === '/api/poblacion/habitantes') return of([]);
      if (url === '/api/poblacion/hogares') return of([]);
      return of({ total: 0 });
    });
    await componente.ngOnInit();

    componente.tipoDocumentoIdBusqueda = 5;
    componente.numeroDocumentoBusqueda = '123';
    await componente.buscar();

    expect(http.get).toHaveBeenLastCalledWith(
      '/api/poblacion/habitantes',
      expect.objectContaining({ params: expect.objectContaining({ tipoDocumentoId: 5, numeroDocumento: '123', offset: 0 }) }),
    );
  });

  it('limpiarBusqueda() limpia los filtros y recarga sin ellos', async () => {
    const { componente, http } = crearComponente(() => of([]));
    await componente.ngOnInit();
    componente.tipoDocumentoIdBusqueda = 5;
    componente.numeroDocumentoBusqueda = '123';

    await componente.limpiarBusqueda();

    expect(componente.tipoDocumentoIdBusqueda).toBeNull();
    expect(componente.numeroDocumentoBusqueda).toBe('');
    const ultimaLlamada = http.get.mock.calls.at(-1);
    expect(ultimaLlamada?.[1]?.params).not.toHaveProperty('tipoDocumentoId');
    expect(ultimaLlamada?.[1]?.params).not.toHaveProperty('numeroDocumento');
  });

  it('en error de red muestra un mensaje traducible y vacía el listado en una recarga completa', async () => {
    const { componente } = crearComponente((url) => {
      if (url === '/api/poblacion/habitantes') return throwError(() => new Error('sin conexión'));
      return of({ total: 0 });
    });

    await componente.ngOnInit();

    expect(componente.error()).toBe('poblacion.errorCargarHabitantes');
    expect(componente.habitantes()).toEqual([]);
  });

  it('edad() calcula años completos a partir de la fecha de nacimiento', async () => {
    const { componente } = crearComponente(() => of([]));
    const hace10Anios = new Date();
    hace10Anios.setFullYear(hace10Anios.getFullYear() - 10);

    expect(componente.edad(hace10Anios.toISOString().slice(0, 10))).toBe(10);
  });

  it('sinComunidad se activa cuando el usuario no tiene comunidad asignada', async () => {
    const { componente, authService } = crearComponente(() => of([]));
    authService.obtenerPerfil.mockResolvedValueOnce({ asignaciones: [{ rol: 'administrador', comunidadId: null }] });

    await componente.ngOnInit();

    expect(componente.sinComunidad()).toBe(true);
    expect(componente.cargando()).toBe(false);
  });
});
