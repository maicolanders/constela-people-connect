import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { CatalogoItemApi } from '../autogestion-login/autogestion-login.component';

interface MiEducacionApi {
  id: number;
  alfabetizado: boolean;
  nivelEducativoCatalogoItemId: number;
  asisteEscuela: boolean;
}

interface HabitanteLenguaApi {
  lenguaCatalogoItemId: number;
  esLenguaMaterna: boolean;
}

/**
 * Fase 14 (autogestión): "editar o agregar información académica" — reusa
 * el dominio de educación existente (Fase 5) vía sus endpoints `mi-registro`.
 * Online-only (mismo criterio que el resto del portal): sin `hogarUuid`/censista,
 * detecta crear-vs-actualizar según si `GET mi-registro` responde 404.
 */
@Component({
  selector: 'app-mi-educacion',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mi-educacion.component.html',
})
export class MiEducacionComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardadoExitoso = signal(false);
  readonly nivelesEducativos = signal<CatalogoItemApi[]>([]);
  readonly lenguasDisponibles = signal<CatalogoItemApi[]>([]);
  private tieneRegistro = false;

  readonly formulario = this.fb.nonNullable.group({
    alfabetizado: this.fb.nonNullable.control(false),
    nivelEducativoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    asisteEscuela: this.fb.nonNullable.control(false),
    lenguas: this.fb.array<ReturnType<typeof this.crearControlLengua>>([]),
  });

  get lenguasFormArray(): FormArray {
    return this.formulario.get('lenguas') as FormArray;
  }

  private crearControlLengua(valores?: HabitanteLenguaApi) {
    return this.fb.nonNullable.group({
      lenguaCatalogoItemId: this.fb.control<number | null>(valores?.lenguaCatalogoItemId ?? null),
      esLenguaMaterna: this.fb.nonNullable.control(valores?.esLenguaMaterna ?? false),
    });
  }

  async ngOnInit(): Promise<void> {
    const [nivelesEducativos, lenguasDisponibles] = await Promise.all([
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/nivel_educativo/items')).catch(() => []),
      firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/lengua/items')).catch(() => []),
    ]);
    this.nivelesEducativos.set(nivelesEducativos);
    this.lenguasDisponibles.set(lenguasDisponibles);

    try {
      const [registro, lenguas] = await Promise.all([
        firstValueFrom(this.http.get<MiEducacionApi>('/api/educacion/mi-registro')),
        firstValueFrom(this.http.get<HabitanteLenguaApi[]>('/api/educacion/mi-registro/lenguas')).catch(() => []),
      ]);
      this.tieneRegistro = true;
      this.formulario.patchValue({
        alfabetizado: registro.alfabetizado,
        nivelEducativoCatalogoItemId: registro.nivelEducativoCatalogoItemId,
        asisteEscuela: registro.asisteEscuela,
      });
      for (const lengua of lenguas) {
        this.lenguasFormArray.push(this.crearControlLengua(lengua));
      }
    } catch (error) {
      if (!(error instanceof HttpErrorResponse && error.status === 404)) {
        this.error.set('autogestion.errorCargarMiEducacion');
      }
    } finally {
      if (this.lenguasFormArray.length === 0) {
        this.agregarLengua();
      }
      this.cargando.set(false);
    }
  }

  agregarLengua(): void {
    this.lenguasFormArray.push(this.crearControlLengua());
  }

  quitarLengua(indice: number): void {
    this.lenguasFormArray.removeAt(indice);
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
      alfabetizado: valores.alfabetizado,
      nivelEducativoCatalogoItemId: valores.nivelEducativoCatalogoItemId,
      asisteEscuela: valores.asisteEscuela,
    };
    const lenguas = valores.lenguas
      .filter((lengua) => lengua.lenguaCatalogoItemId !== null)
      .map((lengua) => ({ lenguaCatalogoItemId: lengua.lenguaCatalogoItemId as number, esLenguaMaterna: lengua.esLenguaMaterna }));

    try {
      if (this.tieneRegistro) {
        await firstValueFrom(this.http.patch('/api/educacion/mi-registro', dto));
      } else {
        await firstValueFrom(this.http.post('/api/educacion/mi-registro', dto));
        this.tieneRegistro = true;
      }
      await firstValueFrom(this.http.put('/api/educacion/mi-registro/lenguas', { lenguas }));
      this.guardadoExitoso.set(true);
    } catch {
      this.error.set('autogestion.errorGuardarMiEducacion');
    } finally {
      this.guardando.set(false);
    }
  }
}
