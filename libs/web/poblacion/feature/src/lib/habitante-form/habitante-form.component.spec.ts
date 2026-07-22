import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, HabitanteOffline, SyncQueueService, SyncService } from '@censo/web-shared-data-access';
import {
  CandidatoDuplicadoOffline,
  DeteccionDuplicadosService,
  HabitantesOfflineService,
  HogaresOfflineService,
} from '@censo/web-poblacion-data-access';
import { HabitanteFormComponent } from './habitante-form.component';

function crearComponente(candidatos: CandidatoDuplicadoOffline[] = []) {
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([]) };
  const hogaresOffline = {
    obtener: jest.fn().mockResolvedValue({ uuid: 'hogar-uuid-1', comunidadId: 3, periodoCensalId: 1 }),
  };
  const habitantesOffline = { guardar: jest.fn().mockResolvedValue(undefined) };
  const deteccionDuplicados = { buscarCandidatos: jest.fn().mockResolvedValue(candidatos) };
  const syncQueue = { encolar: jest.fn().mockResolvedValue(undefined) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const http = { get: jest.fn().mockReturnValue(of({ capturaIdentidadGenero: false })) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: HogaresOfflineService, useValue: hogaresOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: DeteccionDuplicadosService, useValue: deteccionDuplicados },
      { provide: SyncQueueService, useValue: syncQueue },
      { provide: SyncService, useValue: syncService },
      { provide: HttpClient, useValue: http },
      { provide: Router, useValue: router },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ hogarUuid: 'hogar-uuid-1' }) } } },
    ],
  });

  const fixture = TestBed.createComponent(HabitanteFormComponent);
  return { componente: fixture.componentInstance, habitantesOffline, deteccionDuplicados, syncQueue, syncService, router };
}

async function llenarFormularioValido(componente: HabitanteFormComponent): Promise<void> {
  await componente.ngOnInit();
  componente.formulario.patchValue({
    nombres: 'Ana',
    apellidos: 'Perez',
    fechaNacimiento: '1990-05-01',
    sexo: 'F',
    parentescoCatalogoItemId: 7,
  });
}

describe('HabitanteFormComponent — flujo de confirmación de duplicado (RF-01-05)', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('guarda directamente si DeteccionDuplicadosService no encuentra candidatos', async () => {
    const { componente, habitantesOffline, syncQueue } = crearComponente([]);
    await llenarFormularioValido(componente);

    await componente.guardar();

    expect(habitantesOffline.guardar).toHaveBeenCalledTimes(1);
    expect(syncQueue.encolar).not.toHaveBeenCalled();
    expect(componente.candidatosDuplicado()).toBeNull();
  });

  it('tras guardar, navega al hub de acciones del habitante recién creado con mensaje de éxito', async () => {
    const { componente, router } = crearComponente([]);
    await llenarFormularioValido(componente);

    await componente.guardar();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', expect.any(String), 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'poblacion.habitanteGuardadoDescripcion' } },
    );
  });

  it('si falla el guardado, navega al hub con mensaje de error', async () => {
    const { componente, habitantesOffline, router } = crearComponente([]);
    habitantesOffline.guardar.mockRejectedValueOnce(new Error('fallo'));
    await llenarFormularioValido(componente);

    await componente.guardar();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', expect.any(String), 'acciones'],
      { queryParams: { resultado: 'error', mensaje: 'poblacion.errorGuardarHabitante' } },
    );
  });

  it('exige confirmación explícita cuando hay candidatos y no guarda hasta que se confirme', async () => {
    const candidato: CandidatoDuplicadoOffline = { uuid: 'similar-uuid', nombres: 'Ana', apellidos: 'Perez', score: 0.9 };
    const { componente, habitantesOffline, syncQueue } = crearComponente([candidato]);
    await llenarFormularioValido(componente);

    await componente.guardar();

    expect(habitantesOffline.guardar).not.toHaveBeenCalled();
    expect(componente.candidatosDuplicado()).toEqual([candidato]);

    await componente.confirmarNoEsDuplicado();

    expect(habitantesOffline.guardar).toHaveBeenCalledTimes(1);
    expect(syncQueue.encolar).toHaveBeenCalledWith(
      'habitantes',
      expect.any(String),
      'crear',
      expect.objectContaining({
        revisionesDuplicado: [{ habitanteSimilarUuid: 'similar-uuid', scoreSimilitud: 0.9 }],
      }),
    );
    expect(componente.candidatosDuplicado()).toBeNull();
  });

  it('envía edadAproximada en el payload cuando edadEstimada es true (el backend la exige para validar)', async () => {
    const { componente, habitantesOffline } = crearComponente([]);
    await componente.ngOnInit();
    componente.formulario.patchValue({
      nombres: 'Antonio',
      apellidos: 'Morales',
      sexo: 'M',
      parentescoCatalogoItemId: 7,
      edadEstimada: true,
      edadAproximada: 76,
    });

    await componente.guardar();

    expect(habitantesOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ edadEstimada: true, edadAproximada: 76 }),
      'crear',
    );
  });

  it('cancelarDuplicado limpia la alerta sin guardar el habitante', async () => {
    const candidato: CandidatoDuplicadoOffline = { uuid: 'similar-uuid', nombres: 'Ana', apellidos: 'Perez', score: 0.9 };
    const { componente, habitantesOffline } = crearComponente([candidato]);
    await llenarFormularioValido(componente);

    await componente.guardar();
    componente.cancelarDuplicado();

    expect(componente.candidatosDuplicado()).toBeNull();
    expect(habitantesOffline.guardar).not.toHaveBeenCalled();
  });
});

function crearComponenteEdicion(habitanteExistente: HabitanteOffline | undefined) {
  const catalogoOffline = { obtenerItems: jest.fn().mockResolvedValue([]) };
  const hogaresOffline = {
    obtener: jest.fn().mockResolvedValue({ uuid: habitanteExistente?.hogarUuid ?? 'hogar-uuid-1', comunidadId: 3, periodoCensalId: 1 }),
  };
  const habitantesOffline = {
    obtener: jest.fn().mockResolvedValue(habitanteExistente),
    guardar: jest.fn().mockResolvedValue(undefined),
  };
  const deteccionDuplicados = { buscarCandidatos: jest.fn().mockResolvedValue([]) };
  const syncQueue = { encolar: jest.fn().mockResolvedValue(undefined) };
  const syncService = { sincronizar: jest.fn().mockResolvedValue(undefined) };
  const http = { get: jest.fn().mockReturnValue(of({ capturaIdentidadGenero: false })) };
  const router = { navigate: jest.fn().mockResolvedValue(true) };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: CatalogoOfflineService, useValue: catalogoOffline },
      { provide: HogaresOfflineService, useValue: hogaresOffline },
      { provide: HabitantesOfflineService, useValue: habitantesOffline },
      { provide: DeteccionDuplicadosService, useValue: deteccionDuplicados },
      { provide: SyncQueueService, useValue: syncQueue },
      { provide: SyncService, useValue: syncService },
      { provide: HttpClient, useValue: http },
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ habitanteUuid: habitanteExistente?.uuid ?? 'no-existe' }) } },
      },
    ],
  });

  const fixture = TestBed.createComponent(HabitanteFormComponent);
  return { componente: fixture.componentInstance, habitantesOffline, deteccionDuplicados, syncQueue, router };
}

describe('HabitanteFormComponent — modo edición (RF-01-02)', () => {
  const habitanteExistente: HabitanteOffline = {
    uuid: 'habitante-uuid-existente',
    hogarUuid: 'hogar-uuid-1',
    comunidadId: 3,
    periodoCensalId: 1,
    estado: 'activo',
    nombres: 'Ana',
    apellidos: 'Perez',
    fechaNacimiento: '1990-05-01',
    sexo: 'F',
    consentimientoInformado: true,
    origen: 'servidor',
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('carga los datos existentes, patchea el formulario y no ejecuta detección de duplicados al guardar', async () => {
    const { componente, deteccionDuplicados } = crearComponenteEdicion(habitanteExistente);

    await componente.ngOnInit();

    expect(componente.modoEdicion()).toBe(true);
    expect(componente.hogarUuid).toBe('hogar-uuid-1');
    expect(componente.formulario.value.nombres).toBe('Ana');
    expect(componente.formulario.value.apellidos).toBe('Perez');

    await componente.guardar();

    expect(deteccionDuplicados.buscarCandidatos).not.toHaveBeenCalled();
  });

  it('guarda con operación "actualizar" reutilizando el uuid existente y navega con el mensaje de edición', async () => {
    const { componente, habitantesOffline, router } = crearComponenteEdicion(habitanteExistente);

    await componente.ngOnInit();
    componente.formulario.patchValue({ nombres: 'Ana María' });
    await componente.guardar();

    expect(habitantesOffline.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'habitante-uuid-existente', nombres: 'Ana María' }),
      'actualizar',
    );
    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-existente', 'acciones'],
      { queryParams: { resultado: 'exito', mensaje: 'poblacion.habitanteActualizadoDescripcion' } },
    );
  });

  it('si falla el guardado, navega con el mensaje de error de edición', async () => {
    const { componente, habitantesOffline, router } = crearComponenteEdicion(habitanteExistente);
    habitantesOffline.guardar.mockRejectedValueOnce(new Error('fallo'));

    await componente.ngOnInit();
    await componente.guardar();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/poblacion/hogares', 'hogar-uuid-1', 'habitantes', 'habitante-uuid-existente', 'acciones'],
      { queryParams: { resultado: 'error', mensaje: 'poblacion.errorActualizarHabitante' } },
    );
  });

  it('si el habitante no existe en la caché local, muestra error y no carga el hogar', async () => {
    const { componente } = crearComponenteEdicion(undefined);

    await componente.ngOnInit();

    expect(componente.error()).toBe('poblacion.habitanteNoEncontrado');
  });
});
