import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { CatalogoItemApi } from '../autogestion-login/autogestion-login.component';

interface MiEconomiaApi {
  condicionActividadCatalogoItemId: number;
  ocupacionCatalogoItemId: number | null;
  ingresoMensual: string | null;
}

/** Fase 14 (autogestión): "editar o agregar información económica" — reusa el dominio de economía (Fase 6). */
@Component({
  selector: 'app-mi-economia',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mi-economia.component.html',
})
export class MiEconomiaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardadoExitoso = signal(false);
  readonly condicionesActividad = signal<CatalogoItemApi[]>([]);
  readonly ocupaciones = signal<CatalogoItemApi[]>([]);
  readonly condicionSeleccionadaId = signal<number | null>(null);
  private tieneRegistro = false;

  readonly esOcupado = computed(() => {
    const condicion = this.condicionesActividad().find((item) => item.id === this.condicionSeleccionadaId());
    return condicion?.codigo === 'ocupado';
  });

  readonly formulario = this.fb.nonNullable.group({
    condicionActividadCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    ocupacionCatalogoItemId: this.fb.control<number | null>(null),
    ingresoMensual: this.fb.control<number | null>(null),
  });

  async ngOnInit(): Promise<void> {
    const [condicionesActividad, ocupaciones] = await Promise.all([
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/condicion_actividad/items')).catch(() => []),
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/ocupacion/items')).catch(() => []),
    ]);
    this.condicionesActividad.set(condicionesActividad);
    this.ocupaciones.set(ocupaciones);

    try {
      const registro = await firstValueFrom(this.http.get<MiEconomiaApi>('/api/economia/mi-registro'));
      this.tieneRegistro = true;
      this.condicionSeleccionadaId.set(registro.condicionActividadCatalogoItemId);
      this.formulario.patchValue({
        condicionActividadCatalogoItemId: registro.condicionActividadCatalogoItemId,
        ocupacionCatalogoItemId: registro.ocupacionCatalogoItemId,
        ingresoMensual: registro.ingresoMensual !== null ? Number(registro.ingresoMensual) : null,
      });
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.error.set('autogestion.errorCargarMiEconomia');
      }
    } finally {
      this.cargando.set(false);
    }
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
    this.guardadoExitoso.set(false);
    const valores = this.formulario.getRawValue();
    const dto = {
      condicionActividadCatalogoItemId: valores.condicionActividadCatalogoItemId,
      ocupacionCatalogoItemId: this.esOcupado() ? valores.ocupacionCatalogoItemId : null,
      ingresoMensual: valores.ingresoMensual,
    };

    try {
      if (this.tieneRegistro) {
        await firstValueFrom(this.http.patch('/api/economia/mi-registro', dto));
      } else {
        await firstValueFrom(this.http.post('/api/economia/mi-registro', dto));
        this.tieneRegistro = true;
      }
      this.guardadoExitoso.set(true);
    } catch {
      this.error.set('autogestion.errorGuardarMiEconomia');
    } finally {
      this.guardando.set(false);
    }
  }
}
