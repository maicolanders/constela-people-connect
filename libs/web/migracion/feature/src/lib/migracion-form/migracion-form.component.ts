import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoItemCache, CatalogoOfflineService, SyncService, UbicacionGeograficaCache } from '@censo/web-shared-data-access';
import { UbicacionesGeograficasOfflineService } from '@censo/web-georreferenciacion-data-access';
import { HabitantesOfflineService, PeriodoActualService } from '@censo/web-poblacion-data-access';
import { DireccionMigratoria, TipoMovimientoMigratorio } from '@censo/shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { MigracionOfflineService } from '@censo/web-migracion-data-access';

/**
 * RF-07-01: un habitante puede tener múltiples eventos migratorios — a
 * diferencia de `EconomiaFormComponent`/`EducacionFormComponent` (1:1),
 * `guardar()` agrega el evento a la lista (con su propio uuid) y deja el
 * formulario listo para capturar el siguiente en vez de navegar de
 * inmediato; solo al terminar (botón "finalizar") se regresa al hub de
 * acciones del habitante (Fase de mejora continua).
 */
@Component({
  selector: 'app-migracion-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './migracion-form.component.html',
})
export class MigracionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly migracionOffline = inject(MigracionOfflineService);
  private readonly ubicacionesGeograficasOffline = inject(UbicacionesGeograficasOfflineService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly periodoActual = inject(PeriodoActualService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly motivos = signal<CatalogoItemCache[]>([]);
  readonly nodosRaiz = signal<UbicacionGeograficaCache[]>([]);
  readonly eventosCapturados = signal<number>(0);
  readonly tiposMovimiento = Object.values(TipoMovimientoMigratorio);
  readonly direcciones = Object.values(DireccionMigratoria);

  private habitanteUuid = '';
  private hogarUuid = '';
  private periodoCensalId: number | null = null;

  readonly formulario = this.fb.nonNullable.group({
    tipoMovimiento: this.fb.nonNullable.control<TipoMovimientoMigratorio>(TipoMovimientoMigratorio.INTERNA, Validators.required),
    direccion: this.fb.nonNullable.control<DireccionMigratoria>(DireccionMigratoria.SALIDA, Validators.required),
    origenUbicacionGeograficaId: this.fb.control<number | null>(null),
    origenDescripcionLibre: this.fb.control<string | null>(null),
    destinoUbicacionGeograficaId: this.fb.control<number | null>(null),
    destinoDescripcionLibre: this.fb.control<string | null>(null),
    fechaMovimiento: this.fb.control<string | null>(null, Validators.required),
    motivoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    esTemporal: this.fb.nonNullable.control(true),
  });

  async ngOnInit(): Promise<void> {
    this.habitanteUuid = this.route.snapshot.paramMap.get('habitanteUuid') ?? '';
    const habitante = await this.habitantesOffline.obtener(this.habitanteUuid);
    this.hogarUuid = habitante?.hogarUuid ?? '';
    this.periodoCensalId = await this.periodoActual.obtenerIdAbierto();

    this.motivos.set(await this.catalogoOffline.obtenerItems('motivo_migracion'));
    this.nodosRaiz.set(await this.ubicacionesGeograficasOffline.listarHijos());

    const existentes = await this.migracionOffline.listarPorHabitante(this.habitanteUuid);
    this.eventosCapturados.set(existentes.length);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando() || this.periodoCensalId === null) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const valores = this.formulario.getRawValue();

      await this.migracionOffline.guardar({
        uuid: crypto.randomUUID(),
        habitanteUuid: this.habitanteUuid,
        periodoCensalId: this.periodoCensalId,
        tipoMovimiento: valores.tipoMovimiento,
        direccion: valores.direccion,
        origenUbicacionGeograficaId: valores.origenUbicacionGeograficaId,
        origenDescripcionLibre: valores.origenDescripcionLibre,
        destinoUbicacionGeograficaId: valores.destinoUbicacionGeograficaId,
        destinoDescripcionLibre: valores.destinoDescripcionLibre,
        fechaMovimiento: valores.fechaMovimiento as string,
        motivoCatalogoItemId: valores.motivoCatalogoItemId as number,
        esTemporal: valores.esTemporal,
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.irAAccionesHabitante('exito', 'migracion.movimientoGuardadoDescripcion');
    } catch {
      this.error.set('migracion.errorGuardarMovimiento');
      await this.irAAccionesHabitante('error', 'migracion.errorGuardarMovimiento');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Regresa al hub de acciones del habitante (Fase de mejora continua). */
  private async irAAccionesHabitante(resultado: 'exito' | 'error', mensaje: string): Promise<void> {
    if (!this.hogarUuid) {
      await this.router.navigate(['/poblacion/habitantes']);
      return;
    }
    await this.router.navigate(
      ['/poblacion/hogares', this.hogarUuid, 'habitantes', this.habitanteUuid, 'acciones'],
      { queryParams: { resultado, mensaje } },
    );
  }
}
