import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { CatalogoItemApi } from '../autogestion-login/autogestion-login.component';

interface UbicacionGeograficaApi {
  id: number;
  nombre: string;
}

interface MiEtniaApi {
  etniaCatalogoItemId: number;
  lenguaMaternaCatalogoItemId: number | null;
  resguardoUbicacionGeograficaId: number | null;
}

interface MiCondicionVulnerabilidadApi {
  condicionVulnerabilidadCatalogoItemId: number;
}

/**
 * Fase 14 (autogestión): "editar o agregar información de salud" (RF) +
 * identificación étnica/resguardo — mismo entidad 1:1 en el backend
 * (`HabitanteEtnia` + `HabitanteCondicionVulnerabilidad`, Fase 8). El
 * resguardo se captura aquí porque es prerrequisito de la constancia de
 * afiliación (RF item 5): sin `resguardoUbicacionGeograficaId` asignado, la
 * constancia no se puede generar.
 */
@Component({
  selector: 'app-mi-salud',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mi-salud.component.html',
})
export class MiSaludComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardadoExitoso = signal(false);
  readonly etnias = signal<CatalogoItemApi[]>([]);
  readonly lenguas = signal<CatalogoItemApi[]>([]);
  readonly resguardos = signal<UbicacionGeograficaApi[]>([]);
  readonly condicionesDisponibles = signal<CatalogoItemApi[]>([]);
  readonly condicionesSeleccionadas = signal<Set<number>>(new Set());
  private tieneRegistro = false;

  readonly formulario = this.fb.nonNullable.group({
    etniaCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    lenguaMaternaCatalogoItemId: this.fb.control<number | null>(null),
    resguardoUbicacionGeograficaId: this.fb.control<number | null>(null),
  });

  async ngOnInit(): Promise<void> {
    const [etnias, lenguas, condicionesDisponibles, resguardos] = await Promise.all([
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/etnia/items')).catch(() => []),
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/lengua/items')).catch(() => []),
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/condicion_vulnerabilidad/items')).catch(() => []),
      firstValueFrom(this.http.get<UbicacionGeograficaApi[]>('/api/georreferenciacion/ubicaciones-geograficas')).catch(() => []),
    ]);
    this.etnias.set(etnias);
    this.lenguas.set(lenguas);
    this.condicionesDisponibles.set(condicionesDisponibles);
    this.resguardos.set(resguardos);

    try {
      const [registro, condiciones] = await Promise.all([
        firstValueFrom(this.http.get<MiEtniaApi>('/api/etnia-vulnerabilidad/mi-registro')),
        firstValueFrom(
          this.http.get<MiCondicionVulnerabilidadApi[]>('/api/etnia-vulnerabilidad/mi-registro/condiciones-vulnerabilidad'),
        ).catch(() => []),
      ]);
      this.tieneRegistro = true;
      this.formulario.patchValue({
        etniaCatalogoItemId: registro.etniaCatalogoItemId,
        lenguaMaternaCatalogoItemId: registro.lenguaMaternaCatalogoItemId,
        resguardoUbicacionGeograficaId: registro.resguardoUbicacionGeograficaId,
      });
      this.condicionesSeleccionadas.set(new Set(condiciones.map((c) => c.condicionVulnerabilidadCatalogoItemId)));
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.error.set('autogestion.errorCargarMiSalud');
      }
    } finally {
      this.cargando.set(false);
    }
  }

  alternarCondicion(condicionId: number, marcada: boolean): void {
    const nuevaSeleccion = new Set(this.condicionesSeleccionadas());
    if (marcada) {
      nuevaSeleccion.add(condicionId);
    } else {
      nuevaSeleccion.delete(condicionId);
    }
    this.condicionesSeleccionadas.set(nuevaSeleccion);
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.guardadoExitoso.set(false);
    const valores = this.formulario.getRawValue();
    const condiciones = Array.from(this.condicionesSeleccionadas()).map((id) => ({
      condicionVulnerabilidadCatalogoItemId: id,
    }));

    try {
      if (this.tieneRegistro) {
        await firstValueFrom(this.http.patch('/api/etnia-vulnerabilidad/mi-registro', valores));
      } else {
        await firstValueFrom(this.http.post('/api/etnia-vulnerabilidad/mi-registro', valores));
        this.tieneRegistro = true;
      }
      await firstValueFrom(
        this.http.put('/api/etnia-vulnerabilidad/mi-registro/condiciones-vulnerabilidad', { condiciones }),
      );
      this.guardadoExitoso.set(true);
    } catch {
      this.error.set('autogestion.errorGuardarMiSalud');
    } finally {
      this.guardando.set(false);
    }
  }
}
