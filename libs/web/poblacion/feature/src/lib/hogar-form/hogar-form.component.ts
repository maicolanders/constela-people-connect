import { Component, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, SyncService } from '@censo/web-shared-data-access';
import { HogaresOfflineService, PeriodoActualService } from '@censo/web-poblacion-data-access';
import { EstadoHogar } from '@censo/shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * RF-01-03: crea el hogar/núcleo familiar. La comunidad se toma de la
 * asignación del censista autenticado (RT-01), no se pide en el formulario.
 * Guarda siempre en el outbox local (CLAUDE.md: toda pantalla de registro
 * funciona offline por defecto) y dispara una sincronización best-effort.
 */
@Component({
  selector: 'app-hogar-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './hogar-form.component.html',
})
export class HogarFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly hogaresOffline = inject(HogaresOfflineService);
  private readonly periodoActual = inject(PeriodoActualService);
  private readonly syncService = inject(SyncService);
  private readonly router = inject(Router);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    direccionReferencia: [''],
    consentimientoInformado: [false],
  });

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);

    try {
      const usuario = await this.authService.obtenerPerfil();
      const comunidadId = usuario.asignaciones.find((asignacion) => asignacion.comunidadId !== null)?.comunidadId ?? null;
      if (comunidadId === null) {
        this.error.set('poblacion.sinComunidadAsignada');
        return;
      }

      const periodoCensalId = await this.periodoActual.obtenerIdAbierto();
      if (periodoCensalId === null) {
        this.error.set('poblacion.sinPeriodoAbierto');
        return;
      }

      const { direccionReferencia, consentimientoInformado } = this.formulario.getRawValue();
      const uuid = crypto.randomUUID();

      await this.hogaresOffline.guardar(
        {
          uuid,
          comunidadId,
          periodoCensalId,
          estado: EstadoHogar.ACTIVO,
          direccionReferencia: direccionReferencia || null,
          consentimientoInformado,
          consentimientoFecha: consentimientoInformado ? new Date().toISOString() : null,
          origen: 'local',
        },
        'crear',
      );

      void this.syncService.sincronizar();
      await this.router.navigate(['/poblacion/hogares', uuid, 'habitantes', 'nuevo']);
    } catch {
      this.error.set('poblacion.errorGuardarHogar');
    } finally {
      this.guardando.set(false);
    }
  }
}
