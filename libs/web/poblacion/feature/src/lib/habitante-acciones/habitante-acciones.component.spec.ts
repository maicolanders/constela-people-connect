import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { HabitanteAccionesComponent } from './habitante-acciones.component';

function crearComponente(
  habitante: { nombres: string; apellidos: string } | undefined,
  queryParams: Record<string, string> = {},
) {
  const habitantesOffline = { obtener: jest.fn().mockResolvedValue(habitante) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ hogarUuid: 'hogar-uuid-1', habitanteUuid: 'habitante-uuid-1' }),
            queryParamMap: convertToParamMap(queryParams),
          },
        },
      },
    ],
  });

  const fixture = TestBed.createComponent(HabitanteAccionesComponent);
  return { componente: fixture.componentInstance };
}

describe('HabitanteAccionesComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga hogarUuid/habitanteUuid desde la ruta y el nombre del habitante', async () => {
    const { componente } = crearComponente({ nombres: 'Ana', apellidos: 'Perez' });

    await componente.ngOnInit();

    expect(componente.hogarUuid).toBe('hogar-uuid-1');
    expect(componente.habitanteUuid).toBe('habitante-uuid-1');
    expect(componente.nombreHabitante()).toBe('Ana Perez');
  });

  it('lee resultado=exito y el mensaje desde los query params', async () => {
    const { componente } = crearComponente(
      { nombres: 'Ana', apellidos: 'Perez' },
      { resultado: 'exito', mensaje: 'poblacion.habitanteGuardadoDescripcion' },
    );

    await componente.ngOnInit();

    expect(componente.resultado()).toBe('exito');
    expect(componente.mensaje()).toBe('poblacion.habitanteGuardadoDescripcion');
  });

  it('lee resultado=error desde los query params', async () => {
    const { componente } = crearComponente(
      { nombres: 'Ana', apellidos: 'Perez' },
      { resultado: 'error', mensaje: 'poblacion.errorGuardarHabitante' },
    );

    await componente.ngOnInit();

    expect(componente.resultado()).toBe('error');
  });

  it('ignora un valor de resultado desconocido y deja nombreHabitante en null si no se encuentra localmente', async () => {
    const { componente } = crearComponente(undefined, { resultado: 'otro-valor' });

    await componente.ngOnInit();

    expect(componente.resultado()).toBeNull();
    expect(componente.nombreHabitante()).toBeNull();
  });
});
