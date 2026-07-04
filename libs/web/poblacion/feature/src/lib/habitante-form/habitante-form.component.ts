import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CatalogoItemCache,
  CatalogoOfflineService,
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

/**
 * RF-01-01/03/05: registra un habitante de un hogar ya existente. Antes de
 * guardar, compara contra la caché local de habitantes de la misma comunidad
 * (DeteccionDuplicadosService, funciona sin conexión); si hay candidatos por
 * encima del umbral, exige confirmación explícita del censista y esa
 * decisión se adjunta al payload de sincronización (trazabilidad, RF-01-05).
 */
@Component({
  selector: 'app-habitante-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './habitante-form.component.html',
})
export class HabitanteFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  readonly candidatosDuplicado = signal<CandidatoDuplicadoOffline[] | null>(null);

  private hogarUuid = '';
  private comunidadId: number | null = null;
  private periodoCensalId: number | null = null;

  readonly formulario = this.fb.nonNullable.group({
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    tipoDocumentoId: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    fechaNacimiento: ['', Validators.required],
    sexo: this.fb.control<SexoHabitante | ''>('', Validators.required),
    parentescoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    consentimientoInformado: [false],
  });

  readonly sexos = Object.values(SexoHabitante);

  async ngOnInit(): Promise<void> {
    this.hogarUuid = this.route.snapshot.paramMap.get('hogarUuid') ?? '';

    const [tipos, parentescos, hogar] = await Promise.all([
      this.catalogoOffline.obtenerItems('tipo_documento'),
      this.catalogoOffline.obtenerItems('parentesco'),
      this.hogaresOffline.obtener(this.hogarUuid),
    ]);
    this.tiposDocumento.set(tipos);
    this.parentescos.set(parentescos);

    if (!hogar) {
      this.error.set('poblacion.hogarNoEncontrado');
      return;
    }
    this.comunidadId = hogar.comunidadId;
    this.periodoCensalId = hogar.periodoCensalId;
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando() || this.comunidadId === null || this.periodoCensalId === null) {
      return;
    }

    if (this.candidatosDuplicado() === null) {
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

  private async buscarDuplicados(): Promise<CandidatoDuplicadoOffline[]> {
    const { nombres, apellidos, fechaNacimiento } = this.formulario.getRawValue();
    return this.deteccionDuplicados.buscarCandidatos({
      nombres,
      apellidos,
      fechaNacimiento: new Date(fechaNacimiento),
      comunidadId: this.comunidadId as number,
    });
  }

  private async confirmarYGuardar(candidatos: CandidatoDuplicadoOffline[]): Promise<void> {
    this.guardando.set(true);
    this.error.set(null);

    try {
      const valores = this.formulario.getRawValue();
      const uuid = crypto.randomUUID();

      const habitante = {
        uuid,
        hogarUuid: this.hogarUuid,
        comunidadId: this.comunidadId as number,
        periodoCensalId: this.periodoCensalId as number,
        estado: EstadoHabitante.ACTIVO,
        nombres: valores.nombres,
        apellidos: valores.apellidos,
        tipoDocumentoId: valores.tipoDocumentoId,
        numeroDocumento: valores.numeroDocumento || null,
        fechaNacimiento: valores.fechaNacimiento,
        sexo: valores.sexo as SexoHabitante,
        parentescoCatalogoItemId: valores.parentescoCatalogoItemId ?? undefined,
        consentimientoInformado: valores.consentimientoInformado,
        consentimientoFecha: valores.consentimientoInformado ? new Date().toISOString() : null,
        origen: 'local' as const,
      };

      await this.habitantesOffline.guardar(habitante, 'crear');

      // La confirmación de "no es duplicado" (RF-01-05) viaja en el mismo
      // payload de sync para que quede registrada también offline: se
      // actualiza la entrada recién encolada (misma dominio+uuid) con el
      // campo adicional `revisionesDuplicado` que el backend persiste.
      if (candidatos.length > 0) {
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
      this.formulario.reset({ consentimientoInformado: false });
      await this.router.navigate(['/poblacion/hogares', this.hogarUuid, 'habitantes', 'nuevo']);
    } catch {
      this.error.set('poblacion.errorGuardarHabitante');
    } finally {
      this.guardando.set(false);
    }
  }
}
