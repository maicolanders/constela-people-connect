import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  CatalogoItemCache,
  CatalogoOfflineService,
  SyncService,
  UbicacionGeograficaCache,
} from '@censo/web-shared-data-access';
import { HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { ClasificacionUbicacion } from '@censo/shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { HogarUbicacionOfflineService, UbicacionesGeograficasOfflineService } from '@censo/web-georreferenciacion-data-access';

/**
 * RF-03-02/03-04: captura la ubicación GPS de un hogar. `navigator.geolocation`
 * funciona sin conexión (no depende de internet, solo de GPS/wifi), y el
 * guardado va siempre al outbox local (CLAUDE.md: toda pantalla de registro
 * funciona offline por defecto), igual que HogarFormComponent/HabitanteFormComponent.
 */
@Component({
  selector: 'app-hogar-ubicacion-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './hogar-ubicacion-form.component.html',
})
export class HogarUbicacionFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hogaresOffline = inject(HogaresOfflineService);
  private readonly hogarUbicacionOffline = inject(HogarUbicacionOfflineService);
  private readonly ubicacionesGeograficasOffline = inject(UbicacionesGeograficasOfflineService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly capturandoGps = signal(false);
  readonly error = signal<string | null>(null);
  readonly tiposTerritorio = signal<CatalogoItemCache[]>([]);
  readonly niveles = signal<UbicacionGeograficaCache[][]>([]);
  readonly seleccion = signal<number[]>([]);
  readonly clasificaciones = Object.values(ClasificacionUbicacion);

  private hogarUuid = '';
  private comunidadId: number | null = null;

  readonly formulario = this.fb.nonNullable.group({
    latitud: [0, Validators.required],
    longitud: [0, Validators.required],
    precisionMetros: this.fb.control<number | null>(null),
    capturadoEn: ['', Validators.required],
    clasificacion: this.fb.nonNullable.control<ClasificacionUbicacion>(ClasificacionUbicacion.RURAL, Validators.required),
    tipoTerritorioCatalogoItemId: this.fb.control<number | null>(null),
  });

  async ngOnInit(): Promise<void> {
    this.hogarUuid = this.route.snapshot.paramMap.get('hogarUuid') ?? '';
    const hogar = await this.hogaresOffline.obtener(this.hogarUuid);
    this.comunidadId = hogar?.comunidadId ?? null;

    this.tiposTerritorio.set(await this.catalogoOffline.obtenerItems('tipo_territorio'));
    this.niveles.set([await this.ubicacionesGeograficasOffline.listarHijos()]);
  }

  async seleccionarNodo(profundidad: number, idTexto: string): Promise<void> {
    const id = idTexto ? Number(idTexto) : null;
    const nuevaSeleccion = this.seleccion().slice(0, profundidad);
    if (id !== null) {
      nuevaSeleccion[profundidad] = id;
    }
    this.seleccion.set(nuevaSeleccion);

    const nuevosNiveles = this.niveles().slice(0, profundidad + 1);
    if (id !== null) {
      const hijos = await this.ubicacionesGeograficasOffline.listarHijos(id);
      if (hijos.length > 0) {
        nuevosNiveles.push(hijos);
      }
    }
    this.niveles.set(nuevosNiveles);
  }

  async capturarGps(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.error.set('georreferenciacion.gpsNoDisponible');
      return;
    }

    this.capturandoGps.set(true);
    this.error.set(null);
    try {
      const posicion = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject),
      );
      this.formulario.patchValue({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
        precisionMetros: posicion.coords.accuracy,
        capturadoEn: new Date(posicion.timestamp).toISOString(),
      });
    } catch {
      this.error.set('georreferenciacion.errorCapturaGps');
    } finally {
      this.capturandoGps.set(false);
    }
  }

  private ubicacionGeograficaId(): number | null {
    const seleccion = this.seleccion();
    return seleccion.length > 0 ? seleccion[seleccion.length - 1] : null;
  }

  async guardar(): Promise<void> {
    const ubicacionGeograficaId = this.ubicacionGeograficaId();
    if (this.formulario.invalid || this.guardando() || ubicacionGeograficaId === null || this.comunidadId === null) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const { latitud, longitud, precisionMetros, capturadoEn, clasificacion, tipoTerritorioCatalogoItemId } =
        this.formulario.getRawValue();

      await this.hogarUbicacionOffline.guardar({
        uuid: this.hogarUuid,
        hogarUuid: this.hogarUuid,
        comunidadId: this.comunidadId,
        ubicacionGeograficaId,
        latitud,
        longitud,
        precisionMetros,
        capturadoEn,
        clasificacion,
        tipoTerritorioCatalogoItemId,
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.router.navigate(['/poblacion/hogares', this.hogarUuid, 'habitantes', 'nuevo']);
    } catch {
      this.error.set('georreferenciacion.errorGuardarUbicacion');
    } finally {
      this.guardando.set(false);
    }
  }
}
