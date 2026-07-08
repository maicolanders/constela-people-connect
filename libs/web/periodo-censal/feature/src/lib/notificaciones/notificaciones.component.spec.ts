import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '@censo/web-shared-data-access';
import { NotificacionesComponent } from './notificaciones.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };

const NOTIFICACIONES = [
  { id: 1, tipo: 'reencuesta', mensaje: 'Reencuesta próxima', fechaProgramada: '2026-08-01', leidaEn: null },
];

function crearComponente(roles: string[] = ['administrador']) {
  const http = {
    get: jest.fn().mockReturnValue(of(NOTIFICACIONES)),
    post: jest.fn().mockReturnValue(of({ activadas: 2 })),
    patch: jest.fn().mockReturnValue(of({})),
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

  const fixture = TestBed.createComponent(NotificacionesComponent);
  return { componente: fixture.componentInstance, http };
}

describe('NotificacionesComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga las notificaciones pendientes', async () => {
    const { componente } = crearComponente();

    await componente.ngOnInit();

    expect(componente.notificaciones()).toHaveLength(1);
  });

  it('marcarLeida hace PATCH y recarga', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    await componente.marcarLeida(1);

    expect(http.patch).toHaveBeenCalledWith('/api/notificaciones/1/leida', {});
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('programar hace POST con los datos del formulario (administrador)', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    componente.formulario.patchValue({ mensaje: 'Nuevo aviso', fechaProgramada: '2026-09-01' });
    await componente.programar();

    expect(http.post).toHaveBeenCalledWith(
      '/api/notificaciones',
      expect.objectContaining({ mensaje: 'Nuevo aviso', fechaProgramada: '2026-09-01' }),
    );
    expect(componente.mensajeAdmin()).toBe('periodoCensal.notificacionProgramada');
  });

  it('generarRecordatorios hace POST y guarda el conteo de activadas', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    await componente.generarRecordatorios();

    expect(http.post).toHaveBeenCalledWith('/api/notificaciones/generar-recordatorios', {});
    expect(componente.recordatoriosActivados()).toBe(2);
  });
});
