import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';
import * as L from 'leaflet';

export interface PuntoMapaHogarApi {
  hogarId: number;
  ubicacionGeograficaId: number;
  coordenadas: { type: 'Point'; coordinates: [number, number] };
  clasificacion: string;
  tipoTerritorioCatalogoItemId: number | null;
  poblacionHogar: number;
}

export interface NodoMapaAgregadoApi {
  ubicacionGeograficaId: number;
  totalHogares: number | null;
  totalHabitantes: number | null;
  suprimido: boolean;
}

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

/**
 * RF-03-03: mapa interactivo (Leaflet, primer uso real de la dependencia ya
 * instalada) con puntos individuales para censista/líder/administrador, y
 * una tabla agregada (sin coordenadas exactas, con supresión k-anonimity)
 * para analista — la respuesta del backend ya viene en una forma u otra
 * según el rol (MapaHogaresService), este componente solo la renderiza.
 */
@Component({
  selector: 'app-mapa-hogares',
  standalone: true,
  imports: [FormsModule, TranslatePipe, RouterLink],
  templateUrl: './mapa-hogares.component.html',
})
export class MapaHogaresComponent implements AfterViewInit, OnDestroy {
  @ViewChild('contenedorMapa') private readonly contenedorMapa?: ElementRef<HTMLDivElement>;

  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private mapa: L.Map | null = null;

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly puntos = signal<PuntoMapaHogarApi[]>([]);
  readonly nodosAgregados = signal<NodoMapaAgregadoApi[]>([]);
  readonly esVistaAgregada = signal(false);

  async ngAfterViewInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.comunidades.set(
      usuario.asignaciones
        .filter((asignacion): asignacion is { rol: string; comunidadId: number } => asignacion.comunidadId !== null)
        .map((asignacion) => ({ id: asignacion.comunidadId, nombre: `Comunidad ${asignacion.comunidadId}` })),
    );
    if (this.comunidades().length > 0) {
      this.comunidadId.set(this.comunidades()[0].id);
    }
  }

  ngOnDestroy(): void {
    this.mapa?.remove();
  }

  async consultar(): Promise<void> {
    const comunidadId = this.comunidadId();
    const periodoCensalId = this.periodoCensalId();
    if (comunidadId === null || periodoCensalId === null) {
      return;
    }

    this.cargando.set(true);
    this.error.set(null);
    try {
      const datos = await firstValueFrom(
        this.http.get<Array<PuntoMapaHogarApi | NodoMapaAgregadoApi>>('/api/poblacion/hogares/mapa', {
          params: { comunidadId, periodoCensalId },
        }),
      );

      const agregado = datos.length > 0 && 'suprimido' in datos[0];
      this.esVistaAgregada.set(agregado);
      if (agregado) {
        this.nodosAgregados.set(datos as NodoMapaAgregadoApi[]);
        this.puntos.set([]);
      } else {
        this.puntos.set(datos as PuntoMapaHogarApi[]);
        this.nodosAgregados.set([]);
        this.renderizarMarcadores(datos as PuntoMapaHogarApi[]);
      }
    } catch {
      this.error.set('georreferenciacion.errorCargarMapa');
    } finally {
      this.cargando.set(false);
    }
  }

  exportarCsv(): void {
    const filas = this.esVistaAgregada() ? this.nodosAgregados() : this.puntos();
    const csv = generarCsv(filas as unknown as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const enlace = document.createElement('a');
    enlace.href = URL.createObjectURL(blob);
    enlace.download = 'mapa-hogares.csv';
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  private renderizarMarcadores(puntos: PuntoMapaHogarApi[]): void {
    if (!this.contenedorMapa) {
      return;
    }
    if (!this.mapa) {
      this.mapa = L.map(this.contenedorMapa.nativeElement).setView([4.6, -74.1], 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(
        this.mapa,
      );
    }
    const mapa = this.mapa;

    mapa.eachLayer((capa) => {
      if (capa instanceof L.Marker) {
        mapa.removeLayer(capa);
      }
    });

    for (const punto of puntos) {
      const [lng, lat] = punto.coordenadas.coordinates;
      L.marker([lat, lng])
        .bindPopup(`Hogar ${punto.hogarId} · ${punto.poblacionHogar} hab.`)
        .addTo(mapa);
    }

    if (puntos.length > 0) {
      const [lng, lat] = puntos[0].coordenadas.coordinates;
      mapa.setView([lat, lng], 12);
    }
  }
}
