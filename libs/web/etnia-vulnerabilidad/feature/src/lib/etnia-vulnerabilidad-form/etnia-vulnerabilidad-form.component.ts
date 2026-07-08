import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CatalogoItemCache,
  CatalogoOfflineService,
  SyncService,
} from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { EtniaVulnerabilidadOfflineService } from '@censo/web-etnia-vulnerabilidad-data-access';

interface UbicacionGeograficaOpcion {
  id: number;
  nombre: string;
}

/**
 * RF-08-01/02: identificación étnica (pueblo/etnia, lengua materna,
 * resguardo/territorio opcional) y condiciones de vulnerabilidad (selección
 * múltiple de un catálogo fijo). 1:1 con el habitante — mismo patrón de
 * guardado único que `EducacionFormComponent`/`EconomiaFormComponent`.
 *
 * `domain:etnia-vulnerabilidad` NO puede depender de `domain:georreferenciacion`
 * (ver eslint.config.mjs, igual que en el backend): el listado de
 * resguardos/territorios se pide por HTTP directo en vez de reutilizar
 * `UbicacionesGeograficasOfflineService` — mismo criterio que
 * `resguardoUbicacionGeograficaId` en el backend (columna simple, sin
 * relación TypeORM cruzando el límite de dominio).
 */
@Component({
  selector: 'app-etnia-vulnerabilidad-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './etnia-vulnerabilidad-form.component.html',
})
export class EtniaVulnerabilidadFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly etniaVulnerabilidadOffline = inject(
    EtniaVulnerabilidadOfflineService,
  );
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly etnias = signal<CatalogoItemCache[]>([]);
  readonly lenguas = signal<CatalogoItemCache[]>([]);
  readonly resguardos = signal<UbicacionGeograficaOpcion[]>([]);
  readonly condicionesDisponibles = signal<CatalogoItemCache[]>([]);
  readonly condicionesSeleccionadas = signal<Set<number>>(new Set());

  private habitanteUuid = '';

  readonly formulario = this.fb.nonNullable.group({
    etniaCatalogoItemId: this.fb.control<number | null>(
      null,
      Validators.required,
    ),
    lenguaMaternaCatalogoItemId: this.fb.control<number | null>(null),
    resguardoUbicacionGeograficaId: this.fb.control<number | null>(null),
  });

  async ngOnInit(): Promise<void> {
    this.habitanteUuid =
      this.route.snapshot.paramMap.get('habitanteUuid') ?? '';

    const [etnias, lenguas, condiciones, existente] = await Promise.all([
      this.catalogoOffline.obtenerItems('etnia'),
      this.catalogoOffline.obtenerItems('lengua'),
      this.catalogoOffline.obtenerItems('condicion_vulnerabilidad'),
      this.etniaVulnerabilidadOffline.obtenerPorHabitante(this.habitanteUuid),
    ]);
    this.etnias.set(etnias);
    this.lenguas.set(lenguas);
    this.condicionesDisponibles.set(condiciones);

    try {
      this.resguardos.set(
        await firstValueFrom(
          this.http.get<UbicacionGeograficaOpcion[]>(
            '/api/georreferenciacion/ubicaciones-geograficas',
          ),
        ),
      );
    } catch {
      // Sin conexión: el campo de resguardo/territorio queda vacío (es opcional) en vez de bloquear la captura offline-first.
    }

    if (existente) {
      this.formulario.patchValue({
        etniaCatalogoItemId: existente.etniaCatalogoItemId,
        lenguaMaternaCatalogoItemId:
          existente.lenguaMaternaCatalogoItemId ?? null,
        resguardoUbicacionGeograficaId:
          existente.resguardoUbicacionGeograficaId ?? null,
      });
      this.condicionesSeleccionadas.set(
        new Set(
          existente.condicionesVulnerabilidad.map(
            (c) => c.condicionVulnerabilidadCatalogoItemId,
          ),
        ),
      );
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
    try {
      const valores = this.formulario.getRawValue();

      await this.etniaVulnerabilidadOffline.guardar({
        uuid: this.habitanteUuid,
        habitanteUuid: this.habitanteUuid,
        etniaCatalogoItemId: valores.etniaCatalogoItemId as number,
        lenguaMaternaCatalogoItemId: valores.lenguaMaternaCatalogoItemId,
        resguardoUbicacionGeograficaId: valores.resguardoUbicacionGeograficaId,
        condicionesVulnerabilidad: Array.from(
          this.condicionesSeleccionadas(),
        ).map((id) => ({
          condicionVulnerabilidadCatalogoItemId: id,
        })),
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.router.navigate(['/poblacion/habitantes']);
    } catch {
      this.error.set('etniaVulnerabilidad.errorGuardar');
    } finally {
      this.guardando.set(false);
    }
  }
}
