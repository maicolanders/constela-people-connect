import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { HabitanteAuthService } from '@censo/web-shared-data-access';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { AutogestionLoginComponent } from './autogestion-login.component';

function crearComponente() {
  const http = { get: jest.fn().mockReturnValue(of([])) };
  const habitanteAuthService = { iniciarSesion: jest.fn().mockResolvedValue(undefined) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      provideRouter([]),
      { provide: HttpClient, useValue: http },
      { provide: HabitanteAuthService, useValue: habitanteAuthService },
    ],
  });

  const router = TestBed.inject(Router);
  jest.spyOn(router, 'navigate').mockResolvedValue(true);

  const fixture = TestBed.createComponent(AutogestionLoginComponent);
  return { componente: fixture.componentInstance, habitanteAuthService, router };
}

describe('AutogestionLoginComponent (Fase 14)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('no inicia sesión si el formulario es inválido (falta documento/contraseña)', async () => {
    const { componente, habitanteAuthService } = crearComponente();

    await componente.enviar();

    expect(habitanteAuthService.iniciarSesion).not.toHaveBeenCalled();
  });

  it('inicia sesión por documento (no email) y navega a mi-hogar', async () => {
    const { componente, habitanteAuthService, router } = crearComponente();

    componente.formulario.setValue({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'ClaveSegura123' });
    await componente.enviar();

    expect(habitanteAuthService.iniciarSesion).toHaveBeenCalledWith({
      tipoDocumentoId: 1,
      numeroDocumento: '123456',
      password: 'ClaveSegura123',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/autogestion/mi-hogar']);
  });

  it('muestra error si las credenciales son inválidas', async () => {
    const { componente, habitanteAuthService } = crearComponente();
    habitanteAuthService.iniciarSesion.mockRejectedValue(new Error('401'));

    componente.formulario.setValue({ tipoDocumentoId: 1, numeroDocumento: '123456', password: 'ClaveSegura123' });
    await componente.enviar();

    expect(componente.error()).toBe('autogestion.loginError');
  });
});
