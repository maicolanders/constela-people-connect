import { Component, OnInit, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogoItemCache, CatalogoOfflineService, SyncService } from '@censo/web-shared-data-access';
import { HabitantesOfflineService, HogaresOfflineService } from '@censo/web-poblacion-data-access';
import { EstadoHabitante, EstadoServicio } from '@censo/shared-data-access';
import { calcularHacinamiento } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';
import { ViviendaOfflineService } from '@censo/web-vivienda-data-access';

/** Catálogo de "fuente/tipo" que corresponde a cada tipo de servicio (RF-04-02). */
const CATALOGO_FUENTE_POR_SERVICIO: Record<string, string> = {
  agua_potable: 'fuente_agua',
  saneamiento: 'tipo_saneamiento',
  energia_electrica: 'fuente_energia',
  manejo_residuos: 'manejo_residuos',
  conectividad: 'tipo_conectividad',
};

/**
 * RF-04-01/02: caracteriza la vivienda de un hogar y sus servicios básicos.
 * El hacinamiento se muestra "en vivo" (RF-04-01) recalculándolo en el
 * cliente con la misma función pura (`calcularHacinamiento`) que usa el
 * backend, contra los habitantes ya capturados localmente del hogar —
 * funciona offline por defecto, igual que el resto de formularios de campo.
 */
@Component({
  selector: 'app-vivienda-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './vivienda-form.component.html',
})
export class ViviendaFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly hogaresOffline = inject(HogaresOfflineService);
  private readonly habitantesOffline = inject(HabitantesOfflineService);
  private readonly viviendaOffline = inject(ViviendaOfflineService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);
  private readonly syncService = inject(SyncService);

  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tiposVivienda = signal<CatalogoItemCache[]>([]);
  readonly materialesPared = signal<CatalogoItemCache[]>([]);
  readonly materialesPiso = signal<CatalogoItemCache[]>([]);
  readonly materialesTecho = signal<CatalogoItemCache[]>([]);
  readonly tiposServicio = signal<CatalogoItemCache[]>([]);
  readonly fuentesPorTipoServicio = signal<Record<string, CatalogoItemCache[]>>({});
  readonly hacinamientoEnVivo = signal<number | null>(null);
  readonly estadosServicio = Object.values(EstadoServicio);

  private hogarUuid = '';
  private habitanteUuid = '';
  private comunidadId: number | null = null;
  private habitantesActivosDelHogar = 0;

  readonly formulario = this.fb.nonNullable.group({
    tipoViviendaCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    materialParedCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    materialPisoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    materialTechoCatalogoItemId: this.fb.control<number | null>(null, Validators.required),
    numeroHabitaciones: this.fb.control<number | null>(null),
    numeroDormitorios: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    servicios: this.fb.array<ReturnType<typeof this.crearControlServicio>>([]),
  });

  get serviciosFormArray(): FormArray {
    return this.formulario.get('servicios') as FormArray;
  }

  private crearControlServicio(tipoServicioCatalogoItemId: number) {
    return this.fb.nonNullable.group({
      tipoServicioCatalogoItemId: this.fb.nonNullable.control(tipoServicioCatalogoItemId),
      estado: this.fb.nonNullable.control<EstadoServicio>(EstadoServicio.NO),
      fuenteCatalogoItemId: this.fb.control<number | null>(null),
    });
  }

  async ngOnInit(): Promise<void> {
    this.hogarUuid = this.route.snapshot.paramMap.get('hogarUuid') ?? '';
    this.habitanteUuid = this.route.snapshot.queryParamMap.get('habitanteUuid') ?? '';
    const hogar = await this.hogaresOffline.obtener(this.hogarUuid);
    this.comunidadId = hogar?.comunidadId ?? null;

    const habitantes = await this.habitantesOffline.listar();
    this.habitantesActivosDelHogar = habitantes.filter(
      (habitante) => habitante.hogarUuid === this.hogarUuid && habitante.estado === EstadoHabitante.ACTIVO,
    ).length;

    this.tiposVivienda.set(await this.catalogoOffline.obtenerItems('tipo_vivienda'));
    this.materialesPared.set(await this.catalogoOffline.obtenerItems('material_pared'));
    this.materialesPiso.set(await this.catalogoOffline.obtenerItems('material_piso'));
    this.materialesTecho.set(await this.catalogoOffline.obtenerItems('material_techo'));

    const tiposServicio = await this.catalogoOffline.obtenerItems('tipo_servicio_vivienda');
    this.tiposServicio.set(tiposServicio);

    const fuentes: Record<string, CatalogoItemCache[]> = {};
    for (const tipo of tiposServicio) {
      const catalogoFuente = CATALOGO_FUENTE_POR_SERVICIO[tipo.codigo];
      fuentes[tipo.codigo] = catalogoFuente ? await this.catalogoOffline.obtenerItems(catalogoFuente) : [];
      this.serviciosFormArray.push(this.crearControlServicio(tipo.id));
    }
    this.fuentesPorTipoServicio.set(fuentes);
  }

  fuentesPara(codigo: string): CatalogoItemCache[] {
    return this.fuentesPorTipoServicio()[codigo] ?? [];
  }

  actualizarHacinamiento(): void {
    const dormitorios = this.formulario.get('numeroDormitorios')?.value;
    if (!dormitorios || dormitorios <= 0) {
      this.hacinamientoEnVivo.set(null);
      return;
    }
    this.hacinamientoEnVivo.set(calcularHacinamiento(this.habitantesActivosDelHogar, dormitorios));
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando() || this.comunidadId === null) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    try {
      const valores = this.formulario.getRawValue();

      await this.viviendaOffline.guardar({
        uuid: this.hogarUuid,
        hogarUuid: this.hogarUuid,
        comunidadId: this.comunidadId,
        tipoViviendaCatalogoItemId: valores.tipoViviendaCatalogoItemId as number,
        materialParedCatalogoItemId: valores.materialParedCatalogoItemId as number,
        materialPisoCatalogoItemId: valores.materialPisoCatalogoItemId as number,
        materialTechoCatalogoItemId: valores.materialTechoCatalogoItemId as number,
        numeroHabitaciones: valores.numeroHabitaciones,
        numeroDormitorios: valores.numeroDormitorios as number,
        servicios: valores.servicios,
        origen: 'local',
      });

      void this.syncService.sincronizar();
      await this.irAAccionesHabitante('exito', 'vivienda.viviendaGuardadaDescripcion');
    } catch {
      this.error.set('vivienda.errorGuardarVivienda');
      await this.irAAccionesHabitante('error', 'vivienda.errorGuardarVivienda');
    } finally {
      this.guardando.set(false);
    }
  }

  /** Regresa al hub de acciones del habitante que originó esta captura (Fase de mejora continua). */
  private async irAAccionesHabitante(resultado: 'exito' | 'error', mensaje: string): Promise<void> {
    if (!this.habitanteUuid) {
      await this.router.navigate(['/poblacion/habitantes']);
      return;
    }
    await this.router.navigate(
      ['/poblacion/hogares', this.hogarUuid, 'habitantes', this.habitanteUuid, 'acciones'],
      { queryParams: { resultado, mensaje } },
    );
  }
}
