import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  CatalogoItemCache,
  CatalogoOfflineService,
  HabitanteOffline,
  SyncQueueService,
  SyncService,
} from '@censo/web-shared-data-access';
import {
  CandidatoDuplicadoOffline,
  DeteccionDuplicadosService,
  HabitantesOfflineService,
  HogaresOfflineService,
} from '@censo/web-poblacion-data-access';
import { EstadoHabitante, SexoHabitante } from '@censo/shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

interface ComunidadApi {
  capturaIdentidadGenero: boolean;
}

/**
 * RF-01-01/02/03/05: registra un habitante de un hogar ya existente, o edita
 * uno existente cuando la ruta trae `habitanteUuid` (sin `hogarUuid`: el
 * hogar se lee del propio habitante). En modo edición se omite la detección
 * de duplicados (RF-01-05 aplica solo a altas nuevas) y se reutiliza el
 * `uuid` existente en vez de generar uno nuevo. Antes de crear, compara
 * contra la caché local de habitantes de la misma comunidad
 * (DeteccionDuplicadosService, funciona sin conexión); si hay candidatos por
 * encima del umbral, exige confirmación explícita del censista y esa
 * decisión se adjunta al payload de sincronización (trazabilidad, RF-01-05).
 */
@Component({
  selector: 'app-habitante-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './habitante-form.component.html',
})
export class HabitanteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly hogaresOffline = inject(HogaresOfflineService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly deteccionDuplicados = inject(DeteccionDuplicadosService);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tiposDocumento = signal<CatalogoItemCache[]>([]);
  readonly parentescos = signal<CatalogoItemCache[]>([]);
  readonly identidadesGenero = signal<CatalogoItemCache[]>([]);
  readonly capturaIdentidadGenero = signal(false);
  readonly candidatosDuplicado = signal<CandidatoDuplicadoOffline[] | null>(null);
  readonly modoEdicion = signal(false);

  hogarUuid = '';
  private habitanteUuid = '';
  private habitanteExistente: HabitanteOffline | null = null;
  private comunidadId: number | null = null;
  private periodoCensalId: number | null = null;

  readonly formulario = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    tipoDocumentoId: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    fechaNacimiento: [''],
    edadEstimada: [false],
    edadAproximada: this.fb.control<number | null>(null),
    sexo: this.fb.control<SexoHabitante | ''>('', Validators.required),
    identidadGeneroCatalogoItemId: this.fb.control<number | null>(null),
    parentescoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    consentimientoInformado: [false],
  });

  readonly sexos = Object.values(SexoHabitante);

  async ngOnInit(): Promise<void> {
    const habitanteUuidParam = this.route.snapshot.paramMap.get('habitanteUuid');

    const [tipos, parentescos] = await Promise.all([
      this.catalogoOffline.obtenerItems('tipo_documento'),
      this.catalogoOffline.obtenerItems('parentesco'),
    ]);
    this.tiposDocumento.set(tipos);
    this.parentescos.set(parentescos);

    if (habitanteUuidParam) {
      this.modoEdicion.set(true);
      this.habitanteUuid = habitanteUuidParam;
      this.habitanteExistente = (await this.habitantesOffline.obtener(habitanteUuidParam)) ?? null;
      if (!this.habitanteExistente) {
        this.error.set('poblacion.habitanteNoEncontrado');
        return;
      }
      // RF-01-02: al editar solo se envían los campos que cambian
      // (ActualizarHabitanteDto los trata todos como opcionales); a
      // diferencia del alta, el parentesco no es obligatorio aquí — la
      // caché offline de un habitante traído por el pull de solo lectura no
      // siempre lo incluye (ver HabitanteOffline.parentescoCatalogoItemId).
      this.formulario.controls.parentescoCatalogoItemId.clearValidators();
      this.formulario.controls.parentescoCatalogoItemId.updateValueAndValidity();

      this.hogarUuid = this.habitanteExistente.hogarUuid;
      this.formulario.patchValue({
        nombres: this.habitanteExistente.nombres,
        apellidos: this.habitanteExistente.apellidos,
        tipoDocumentoId: this.habitanteExistente.tipoDocumentoId ?? null,
        numeroDocumento: this.habitanteExistente.numeroDocumento ?? '',
        fechaNacimiento: this.habitanteExistente.fechaNacimiento,
        sexo: this.habitanteExistente.sexo as SexoHabitante,
        parentescoCatalogoItemId: this.habitanteExistente.parentescoCatalogoItemId ?? null,
        consentimientoInformado: this.habitanteExistente.consentimientoInformado ?? false,
      });
    } else {
      this.hogarUuid = this.route.snapshot.paramMap.get('hogarUuid') ?? '';
    }

    const hogar = await this.hogaresOffline.obtener(this.hogarUuid);
    if (!hogar) {
      this.error.set('poblacion.hogarNoEncontrado');
      return;
    }
    this.comunidadId = hogar.comunidadId;
    this.periodoCensalId = hogar.periodoCensalId;

    // RF-02-01: la identidad de género es "configurable/activable según parametrización" por comunidad.
    try {
      const comunidad = await firstValueFrom(this.http.get<ComunidadApi>(`/api/comunidades/${this.comunidadId}`));
      if (comunidad.capturaIdentidadGenero) {
        this.capturaIdentidadGenero.set(true);
        this.identidadesGenero.set(await this.catalogoOffline.obtenerItems('identidad_genero'));
      }
    } catch {
      // Sin conexión: se omite el campo opcional en vez de bloquear la captura offline-first.
    }
  }

  /** RF-02-01: exige fechaNacimiento exacta o (edadEstimada + edadAproximada), no ambas vacías. */
  datosEdadValidos(): boolean {
    const { fechaNacimiento, edadEstimada, edadAproximada } = this.formulario.getRawValue();
    return edadEstimada ? edadAproximada !== null : fechaNacimiento.trim().length > 0;
  }

  async guardar(): Promise<void> {
    if (
      this.formulario.invalid ||
      !this.datosEdadValidos() ||
      this.guardando() ||
      this.comunidadId === null ||
      this.periodoCensalId === null
    ) {
      return;
    }

    if (!this.modoEdicion() && this.candidatosDuplicado() === null) {
      const candidatos = await this.buscarDuplicados();
      if (candidatos.length > 0) {
        this.candidatosDuplicado.set(candidatos);
        return;
      }
    }

    await this.confirmarYGuardar(this.candidatosDuplicado() ?? []);
  }

  cancelarDuplicado(): void {
    this.candidatosDuplicado.set(null);
  }

  async confirmarNoEsDuplicado(): Promise<void> {
    await this.confirmarYGuardar(this.candidatosDuplicado() ?? []);
  }

  /** Espejo de HabitanteService.resolverFechaNacimiento (backend): misma síntesis 1-enero para edad estimada. */
  private resolverFechaNacimiento(): string {
    const { fechaNacimiento, edadEstimada, edadAproximada } = this.formulario.getRawValue();
    if (edadEstimada && edadAproximada !== null) {
      return `${new Date().getFullYear() - edadAproximada}-01-01`;
    }
    return fechaNacimiento;
  }

  private async buscarDuplicados(): Promise<CandidatoDuplicadoOffline[]> {
    const { nombres, apellidos } = this.formulario.getRawValue();
    return this.deteccionDuplicados.buscarCandidatos({
      nombres,
      apellidos,
      fechaNacimiento: new Date(this.resolverFechaNacimiento()),
      comunidadId: this.comunidadId as number,
    });
  }

  private async confirmarYGuardar(candidatos: CandidatoDuplicadoOffline[]): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);
    const edicion = this.modoEdicion();
    const uuid = edicion ? this.habitanteUuid : crypto.randomUUID();

    try {
      const valores = this.formulario.getRawValue();
      const camposComunes = {
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        tipoDocumentoId: valores.tipoDocumentoId,
        numeroDocumento: valores.numeroDocumento || null,
        fechaNacimiento: this.resolverFechaNacimiento(),
        sexo: valores.sexo as SexoHabitante,
        identidadGeneroCatalogoItemId: valores.identidadGeneroCatalogoItemId ?? undefined,
        parentescoCatalogoItemId: valores.parentescoCatalogoItemId ?? undefined,
        consentimientoInformado: valores.consentimientoInformado,
        consentimientoFecha: valores.consentimientoInformado ? new Date().toISOString() : null,
      };

      const habitante = edicion
        ? { ...(this.habitanteExistente as HabitanteOffline), ...camposComunes }
        : {
            uuid,
            hogarUuid: this.hogarUuid,
            comunidadId: this.comunidadId as number,
            periodoCensalId: this.periodoCensalId as number,
            estado: EstadoHabitante.ACTIVO,
            edadEstimada: valores.edadEstimada,
            // El backend recalcula/valida contra este valor crudo (CrearHabitanteDto exige
            // edadAproximada cuando edadEstimada es true); resolverFechaNacimiento() ya lo
            // consumió para sintetizar fechaNacimiento, pero debe viajar también tal cual.
            edadAproximada: valores.edadAproximada ?? undefined,
            origen: 'local' as const,
            ...camposComunes,
          };

      await this.habitantesOffline.guardar(habitante, edicion ? 'actualizar' : 'crear');

      // La confirmación de "no es duplicado" (RF-01-05) viaja en el mismo
      // payload de sync para que quede registrada también offline: se
      // actualiza la entrada recién encolada (misma dominio+uuid) con el
      // campo adicional `revisionesDuplicado` que el backend persiste.
      if (!edicion && candidatos.length > 0) {
        await this.syncQueue.encolar('habitantes', uuid, 'crear', {
          ...habitante,
          revisionesDuplicado: candidatos.map((candidato) => ({
            habitanteSimilarUuid: candidato.uuid,
            scoreSimilitud: candidato.score,
          })),
        });
      }

      void this.syncService.sincronizar();
      this.candidatosDuplicado.set(null);
      const mensajeExito = edicion ? 'poblacion.habitanteActualizadoDescripcion' : 'poblacion.habitanteGuardadoDescripcion';
      await this.irAAccionesHabitante(uuid, 'exito', mensajeExito);
    } catch {
      const mensajeError = edicion ? 'poblacion.errorActualizarHabitante' : 'poblacion.errorGuardarHabitante';
      await this.irAAccionesHabitante(uuid, 'error', mensajeError);
    } finally {
      this.guardando.set(false);
    }
  }

  /** Navega al hub de acciones del habitante (Fase de mejora continua): toda pantalla de registro relacionada termina aquí, con éxito o error. */
  private async irAAccionesHabitante(uuid: string, resultado: 'exito' | 'error', mensaje: string): Promise<void> {
    await this.router.navigate(['/poblacion/hogares', this.hogarUuid, 'habitantes', uuid, 'acciones'], {
      queryParams: { resultado, mensaje },
    });
  }
}
