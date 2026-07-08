import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

interface PresupuestoApi {
  id: number;
  comunidadId: number;
  periodoCensalId: number;
  monto: string;
  observaciones: string | null;
}

/**
 * RF-09-02: registro de presupuesto por comunidad+periodo. A diferencia de
 * todos los formularios de dominios anteriores, esta pantalla NO usa el
 * outbox offline (`OfflineRepository`/`SyncService`): analista/administrador
 * trabajan con conexión, no es captura de campo — guarda directo por HTTP.
 * Si ya existe un presupuesto para la comunidad+periodo seleccionados, el
 * formulario lo precarga y cambia a modo actualización (`PATCH`) en vez de
 * crear uno nuevo (que el backend rechazaría por la restricción única).
 */
@Component({
  selector: 'app-presupuesto-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './presupuesto-form.component.html',
})
export class PresupuestoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly guardadoExitoso = signal(false);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);

  private presupuestoExistenteId: number | null = null;

  readonly formulario = this.fb.nonNullable.group({
    comunidadId: this.fb.control<number | null>(null, Validators.required),
    periodoCensalId: this.fb.control<number | null>(null, Validators.required),
    monto: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
    ]),
    observaciones: this.fb.control<string | null>(null),
  });

  async ngOnInit(): Promise<void> {
    const [comunidades, periodos] = await Promise.all([
      firstValueFrom(this.http.get<ComunidadOpcion[]>('/api/comunidades')),
      firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales')),
    ]);
    this.comunidades.set(comunidades);
    this.periodos.set(periodos);
  }

  async onComunidadOPeriodoChange(): Promise<void> {
    const { comunidadId, periodoCensalId } = this.formulario.getRawValue();
    this.presupuestoExistenteId = null;
    this.guardadoExitoso.set(false);
    if (comunidadId === null || periodoCensalId === null) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      const presupuestos = await firstValueFrom(
        this.http.get<PresupuestoApi[]>('/api/recursos/presupuestos', {
          params: { periodoCensalId },
        }),
      );
      const existente = presupuestos.find((p) => p.comunidadId === comunidadId);
      if (existente) {
        this.presupuestoExistenteId = existente.id;
        this.formulario.patchValue({
          monto: Number(existente.monto),
          observaciones: existente.observaciones,
        });
      } else {
        this.formulario.patchValue({ monto: null, observaciones: null });
      }
    } catch {
      this.error.set('recursos.errorConsultarPresupuesto');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.guardadoExitoso.set(false);
    try {
      const valores = this.formulario.getRawValue();

      if (this.presupuestoExistenteId !== null) {
        await firstValueFrom(
          this.http.patch(
            `/api/recursos/presupuestos/${this.presupuestoExistenteId}`,
            {
              monto: valores.monto,
              observaciones: valores.observaciones,
            },
          ),
        );
      } else {
        const creado = await firstValueFrom(
          this.http.post<PresupuestoApi>('/api/recursos/presupuestos', {
            comunidadId: valores.comunidadId,
            periodoCensalId: valores.periodoCensalId,
            monto: valores.monto,
            observaciones: valores.observaciones,
          }),
        );
        this.presupuestoExistenteId = creado.id;
      }

      this.guardadoExitoso.set(true);
    } catch {
      this.error.set('recursos.errorGuardarPresupuesto');
    } finally {
      this.guardando.set(false);
    }
  }
}
