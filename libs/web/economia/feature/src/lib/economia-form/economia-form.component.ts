import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoItemCache, CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { EconomiaOfflineService } from '@censo/web-economia-data-access';

/** RF-06-01: condición de actividad, tipo de ocupación (solo si condición = 'ocupado') e ingreso mensual opcional. */
@Component({
  selector: 'app-economia-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './economia-form.component.html',
})
export class EconomiaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly economiaOffline = inject(EconomiaOfflineService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly condicionesActividad = signal<CatalogoItemCache[]>([]);
  readonly ocupaciones = signal<CatalogoItemCache[]>([]);
  readonly condicionSeleccionadaId = signal<number | null>(null);

  readonly esOcupado = computed(() => {
    const condicion = this.condicionesActividad().find((item) => item.id === this.condicionSeleccionadaId());
    return condicion?.codigo === 'ocupado';
  });

  private habitanteUuid = '';
  private hogarUuid = '';

  readonly formulario = this.fb.nonNullable.group({
    condicionActividadCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    ocupacionCatalogoItemId: this.fb.control<number | null>(null),
    ingresoMensual: this.fb.control<number | null>(null),
  });

  async ngOnInit(): Promise<void> {
    this.habitanteUuid = this.route.snapshot.paramMap.get('habitanteUuid') ?? '';
    const habitante = await this.habitantesOffline.obtener(this.habitanteUuid);
    this.hogarUuid = habitante?.hogarUuid ?? '';

    this.condicionesActividad.set(await this.catalogoOffline.obtenerItems('condicion_actividad'));
    this.ocupaciones.set(await this.catalogoOffline.obtenerItems('ocupacion'));
  }

  onCondicionChange(valor: string): void {
    const id = valor ? Number(valor) : null;
    this.condicionSeleccionadaId.set(id);
    this.formulario.patchValue({ condicionActividadCatalogoItemId: id });
    if (!this.esOcupado()) {
      this.formulario.patchValue({ ocupacionCatalogoItemId: null });
    }
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const valores = this.formulario.getRawValue();

      await this.economiaOffline.guardar({
        uuid: this.habitanteUuid,
        habitanteUuid: this.habitanteUuid,
        condicionActividadCatalogoItemId: valores.condicionActividadCatalogoItemId as number,
        ocupacionCatalogoItemId: this.esOcupado() ? valores.ocupacionCatalogoItemId : null,
        ingresoMensual: valores.ingresoMensual,
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.irAAccionesHabitante('exito', 'economia.economiaGuardadaDescripcion');
    } catch {
      this.error.set('economia.errorGuardarEconomia');
      await this.irAAccionesHabitante('error', 'economia.errorGuardarEconomia');
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
