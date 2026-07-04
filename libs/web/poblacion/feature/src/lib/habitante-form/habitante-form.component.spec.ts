import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { CatalogoOfflineService, SyncQueueService, SyncService } from '@censo/web-shared-data-access';
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
