import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CatalogoItemCache, CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { EducacionOfflineService } from '@censo/web-educacion-data-access';

/**
 * RF-05-01: alfabetismo, último nivel educativo, asistencia escolar y
 * lengua(s) habladas (lista dinámica, marca de lengua materna). Guardado
 * offline por defecto, mismo patrón que ViviendaFormComponent (Fase 4).
 */
@Component({
  selector: 'app-educacion-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './educacion-form.component.html',
})
export class EducacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly educacionOffline = inject(EducacionOfflineService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly nivelesEducativos = signal<CatalogoItemCache[]>([]);
  readonly lenguasDisponibles = signal<CatalogoItemCache[]>([]);

  private habitanteUuid = '';

  readonly formulario = this.fb.nonNullable.group({
    alfabetizado: this.fb.nonNullable.control(false),
    nivelEducativoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    asisteEscuela: this.fb.nonNullable.control(false),
    lenguas: this.fb.array<ReturnType<typeof this.crearControlLengua>>([]),
  });

  get lenguasFormArray(): FormArray {
    return this.formulario.get('lenguas') as FormArray;
  }

  /** Sin validador `required`: una fila sin lengua seleccionada simplemente se descarta al guardar (ver `guardar()`). */
  private crearControlLengua() {
    return this.fb.nonNullable.group({
      lenguaCatalogoItemId: this.fb.control<number | null>(null),
      esLenguaMaterna: this.fb.nonNullable.control(false),
    });
  }

  async ngOnInit(): Promise<void> {
    this.habitanteUuid = this.route.snapshot.paramMap.get('habitanteUuid') ?? '';

    this.nivelesEducativos.set(await this.catalogoOffline.obtenerItems('nivel_educativo'));
    this.lenguasDisponibles.set(await this.catalogoOffline.obtenerItems('lengua'));

    this.agregarLengua();
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
    try {
      const valores = this.formulario.getRawValue();

      await this.educacionOffline.guardar({
        uuid: this.habitanteUuid,
        habitanteUuid: this.habitanteUuid,
        alfabetizado: valores.alfabetizado,
        nivelEducativoCatalogoItemId: valores.nivelEducativoCatalogoItemId as number,
        asisteEscuela: valores.asisteEscuela,
        lenguas: valores.lenguas
          .filter((lengua) => lengua.lenguaCatalogoItemId !== null)
          .map((lengua) => ({
            lenguaCatalogoItemId: lengua.lenguaCatalogoItemId as number,
            esLenguaMaterna: lengua.esLenguaMaterna,
          })),
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.router.navigate(['/poblacion/habitantes']);
    } catch {
      this.error.set('educacion.errorGuardarEducacion');
    } finally {
      this.guardando.set(false);
    }
  }
}
