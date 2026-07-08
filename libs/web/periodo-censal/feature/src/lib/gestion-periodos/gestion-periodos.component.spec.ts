import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '@censo/web-shared-data-access';
import { GestionPeriodosComponent } from './gestion-periodos.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };

const PERIODOS = [
  { id: 1, nombre: 'Censo 2020', codigo: 'censo-2020', fechaInicio: '2020-01-01', fechaCierre: '2020-12-31', estado: 'cerrado', periodoOrigenId: null },
  { id: 2, nombre: 'Censo 2026', codigo: 'censo-2026', fechaInicio: '2026-01-01', fechaCierre: null, estado: 'abierto', periodoOrigenId: 1 },
];

function crearComponente(roles: string[] = ['administrador']) {
  const http = {
    get: jest.fn().mockReturnValue(of(PERIODOS)),
    post: jest.fn().mockReturnValue(of({})),
  };
  const authService = { obtenerPerfil: jest.fn().mockResolvedValue({ id: 1, email: 'a@a.com', roles, asignaciones: [] }) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HttpClient, useValue: http },
      { provide: AuthService, useValue: authService },
      { provide: ActivatedRoute, useValue: ACTIVATED_ROUTE_STUB },
    ],
  });

  const fixture = TestBed.createComponent(GestionPeriodosComponent);
  return { componente: fixture.componentInstance, http };
}

describe('GestionPeriodosComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga la lista de periodos y detecta rol administrador', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.periodos()).toHaveLength(2);
    expect(componente.esAdministrador()).toBe(true);
  });

  it('no marca administrador para un rol censista', async () => {
    const { componente } = crearComponente(['censista']);

    await componente.ngOnInit();

    expect(componente.esAdministrador()).toBe(false);
  });

  it('crea un periodo censal nuevo (POST sin origen)', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.setValue({ nombre: 'Censo 2030', codigo: 'censo-2030', fechaInicio: '2030-01-01' });
    await componente.guardar();

    expect(http.post).toHaveBeenCalledWith('/api/periodos-censales', {
      nombre: 'Censo 2030',
      codigo: 'censo-2030',
      fechaInicio: '2030-01-01',
    });
  });

  it('al preparar "iniciar nuevo" desde un periodo, guarda contra el endpoint iniciar-nuevo del origen', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    componente.prepararIniciarNuevo(1);
    componente.formulario.setValue({ nombre: 'Censo 2027', codigo: 'censo-2027', fechaInicio: '2027-01-01' });
    await componente.guardar();

    expect(http.post).toHaveBeenCalledWith('/api/periodos-censales/1/iniciar-nuevo', {
      nombre: 'Censo 2027',
      codigo: 'censo-2027',
      fechaInicio: '2027-01-01',
    });
    expect(componente.periodoOrigenId()).toBeNull();
  });

  it('abrir/cerrar invocan el endpoint correspondiente y recargan', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    await componente.abrir(1);
    expect(http.post).toHaveBeenCalledWith('/api/periodos-censales/1/abrir', {});

    await componente.cerrar(2);
    expect(http.post).toHaveBeenCalledWith('/api/periodos-censales/2/cerrar', {});
  });
});
