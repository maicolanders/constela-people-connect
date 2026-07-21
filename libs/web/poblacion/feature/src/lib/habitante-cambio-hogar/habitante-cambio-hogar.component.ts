import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CatalogoItemCache, CatalogoOfflineService, HabitanteOffline, HogarOffline, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService, HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { HogarBuscadoResultado, HogarBuscadorComponent } from '../hogar-buscador/hogar-buscador.component';

/**
 * RF-01-03: reasigna un habitante existente a otro hogar de la misma
 * comunidad (cambio de núcleo familiar). El aviso sobre jefatura de hogar es
 * estático, no condicional: la caché offline (`HabitanteOffline`) no guarda
 * el id numérico del habitante, solo su uuid, lo que hace poco confiable
 * detectar aquí si es jefe del hogar de origen (mejora futura opcional).
 */
@Component({
  selector: 'app-habitante-cambio-hogar',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe, HogarBuscadorComponent],
  templateUrl: './habitante-cambio-hogar.component.html',
})
export class HabitanteCambioHogarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly hogaresOffline = inject(HogaresOfflineService);
  private readonly syncService = inject(SyncService);

  habitanteUuid = '';
  readonly parentescoControl = new FormControl<number | null>(null);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly habitante = signal<HabitanteOffline | null>(null);
  readonly hogarOrigen = signal<HogarOffline | null>(null);
  readonly parentescos = signal<CatalogoItemCache[]>([]);
  readonly hogarDestino = signal<HogarBuscadoResultado | null>(null);

  async ngOnInit(): Promise<void> {
    this.habitanteUuid = this.route.snapshot.paramMap.get('habitanteUuid') ?? '';

    const [habitante, parentescos] = await Promise.all([
      this.habitantesOffline.obtener(this.habitanteUuid),
      this.catalogoOffline.obtenerItems('parentesco'),
    ]);
    this.parentescos.set(parentescos);

    if (!habitante) {
      this.error.set('poblacion.habitanteNoEncontrado');
      this.cargando.set(false);
      return;
    }
    this.habitante.set(habitante);

    const hogarOrigen = await this.hogaresOffline.obtener(habitante.hogarUuid);
    if (!hogarOrigen) {
      this.error.set('poblacion.hogarNoEncontrado');
      this.cargando.set(false);
      return;
    }
    this.hogarOrigen.set(hogarOrigen);
    this.cargando.set(false);
  }

  seleccionarHogar(hogar: HogarBuscadoResultado): void {
    this.hogarDestino.set(hogar);
  }

  puedeConfirmar(): boolean {
    return this.hogarDestino() !== null && this.parentescoControl.value !== null && !this.guardando();
  }

  async confirmar(): Promise<void> {
    const habitante = this.habitante();
    const destino = this.hogarDestino();
    const parentescoCatalogoItemId = this.parentescoControl.value;
    if (!habitante || !destino || parentescoCatalogoItemId === null || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    try {
      await this.habitantesOffline.guardar(
        { ...habitante, hogarUuid: destino.uuid, parentescoCatalogoItemId },
        'actualizar',
      );
      void this.syncService.sincronizar();
      await this.router.navigate(['/poblacion/hogares', destino.uuid, 'habitantes', this.habitanteUuid, 'acciones'], {
        queryParams: { resultado: 'exito', mensaje: 'poblacion.habitanteReasignadoDescripcion' },
      });
    } catch {
      await this.router.navigate(
        ['/poblacion/hogares', habitante.hogarUuid, 'habitantes', this.habitanteUuid, 'acciones'],
        { queryParams: { resultado: 'error', mensaje: 'poblacion.errorCambiarHogar' } },
      );
    } finally {
      this.guardando.set(false);
    }
  }
}
