import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

interface HabitanteApi {
  id: number;
  hogarId: number;
  comunidadId: number;
  nombres: string;
  apellidos: string;
  estado: string;
  sexo: string;
  fechaNacimiento: string;
  edadEstimada: boolean;
}

interface HabitanteEducacionApi {
  alfabetizado: boolean;
  asisteEscuela: boolean;
  nivelEducativoCatalogoItemId: number;
}

interface HabitanteOcupacionApi {
  condicionActividadCatalogoItemId: number;
  ocupacionCatalogoItemId: number | null;
  ingresoMensual: string | null;
}

interface HabitanteEtniaApi {
  etniaCatalogoItemId: number;
  lenguaMaternaCatalogoItemId: number | null;
}

interface MovimientoMigratorioApi {
  id: number;
  tipoMovimiento: string;
  direccion: string;
  fechaMovimiento: string;
  esTemporal: boolean;
  motivoCatalogoItemId: number;
}

interface ViviendaApi {
  tipoViviendaCatalogoItemId: number;
  materialParedCatalogoItemId: number;
  materialPisoCatalogoItemId: number;
  materialTechoCatalogoItemId: number;
  numeroDormitorios: number;
}

interface CatalogoItemApi {
  id: number;
  nombre: string;
}

const CATALOGOS_A_RESOLVER = [
  'tipo_vivienda',
  'material_pared',
  'material_piso',
  'material_techo',
  'nivel_educativo',
  'condicion_actividad',
  'ocupacion',
  'etnia',
  'lengua',
  'motivo_migracion',
];

/**
 * Fase 11: ficha completa de un habitante para el panel de administración —
 * compone las lecturas por-habitante ya existentes de cada dominio
 * (educación, economía, etnia, migración) más la vivienda de su hogar, sin
 * ningún endpoint de agregación nuevo. Cada sección es independiente: si el
 * habitante no tiene registro en un dominio (404), esa sección se muestra
 * como "sin datos" en vez de romper el resto de la ficha.
 */
@Component({
  selector: 'app-habitante-ficha',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './habitante-ficha.component.html',
})
export class HabitanteFichaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private catalogoPorId = new Map<number, string>();

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly habitante = signal<HabitanteApi | null>(null);
  readonly vivienda = signal<ViviendaApi | null>(null);
  readonly educacion = signal<HabitanteEducacionApi | null>(null);
  readonly ocupacion = signal<HabitanteOcupacionApi | null>(null);
  readonly etnia = signal<HabitanteEtniaApi | null>(null);
  readonly migraciones = signal<MovimientoMigratorioApi[]>([]);

  async ngOnInit(): Promise<void> {
    const habitanteId = Number(this.route.snapshot.paramMap.get('id'));
    try {
      const [habitante, mapaCatalogos] = await Promise.all([
        firstValueFrom(this.http.get<HabitanteApi>(`/api/poblacion/habitantes/${habitanteId}`)),
        this.cargarCatalogos(),
      ]);
      this.habitante.set(habitante);
      this.catalogoPorId = mapaCatalogos;

      const [vivienda, educacion, ocupacion, etnia, migraciones] = await Promise.all([
        firstValueFrom(this.http.get<ViviendaApi>(`/api/vivienda/hogares/${habitante.hogarId}`)).catch(() => null),
        firstValueFrom(this.http.get<HabitanteEducacionApi>(`/api/educacion/habitantes/${habitanteId}`)).catch(() => null),
        firstValueFrom(this.http.get<HabitanteOcupacionApi>(`/api/economia/habitantes/${habitanteId}`)).catch(() => null),
        firstValueFrom(this.http.get<HabitanteEtniaApi>(`/api/etnia-vulnerabilidad/habitantes/${habitanteId}`)).catch(() => null),
        firstValueFrom(this.http.get<MovimientoMigratorioApi[]>(`/api/migracion/habitantes/${habitanteId}`)).catch(() => []),
      ]);
      this.vivienda.set(vivienda);
      this.educacion.set(educacion);
      this.ocupacion.set(ocupacion);
      this.etnia.set(etnia);
      this.migraciones.set(migraciones);
    } catch {
      this.error.set('administracion.errorCargarHabitante');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreCatalogo(id: number | null): string {
    if (id === null) {
      return '—';
    }
    return this.catalogoPorId.get(id) ?? `#${id}`;
  }

  private async cargarCatalogos(): Promise<Map<number, string>> {
    const listas = await Promise.all(
      CATALOGOS_A_RESOLVER.map((tipo) =>
        firstValueFrom(this.http.get<CatalogoItemApi[]>(`/api/catalogos/${tipo}/items`)).catch(() => []),
      ),
    );
    const mapa = new Map<number, string>();
    for (const lista of listas) {
      for (const item of lista) {
        mapa.set(item.id, item.nombre);
      }
    }
    return mapa;
  }
}
