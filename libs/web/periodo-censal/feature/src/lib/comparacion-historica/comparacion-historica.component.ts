import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

export interface PuntoComparacionApi {
  periodoCensalId: number;
  periodoNombre: string;
  poblacionTotal: number | null;
  coberturaServiciosPromedio: number | null;
  suprimido: boolean;
}

export interface ComparacionComunidadApi {
  comunidadId: number;
  comunidadNombre: string;
  puntos: PuntoComparacionApi[];
}

const ANCHO_GRAFICO = 240;
const ALTO_GRAFICO = 60;

/** RF-10-02: comparación histórica (crecimiento poblacional, variación de cobertura de servicios) entre 2+ periodos. */
@Component({
  selector: 'app-comparacion-historica',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './comparacion-historica.component.html',
})
export class ComparacionHistoricaComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly seleccionados = signal<number[]>([]);
  readonly resultado = signal<ComparacionComunidadApi[]>([]);

  readonly puedeComparar = computed(() => this.seleccionados().length >= 2);

  async ngOnInit(): Promise<void> {
    try {
      const periodos = await firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales'));
      this.periodos.set(periodos);
      this.seleccionados.set(periodos.slice(0, 2).map((p) => p.id));
      if (this.seleccionados().length >= 2) {
        await this.comparar();
      }
    } catch {
      this.error.set('periodoCensal.errorCargar');
    } finally {
      this.cargando.set(false);
    }
  }

  alternarSeleccion(periodoId: number, marcado: boolean): void {
    const actuales = this.seleccionados();
    this.seleccionados.set(marcado ? [...actuales, periodoId] : actuales.filter((id) => id !== periodoId));
  }

  async comparar(): Promise<void> {
    if (!this.puedeComparar()) {
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.resultado.set(
        await firstValueFrom(
          this.http.get<ComparacionComunidadApi[]>('/api/periodos-censales/comparacion-historica', {
            params: { periodoCensalIds: this.seleccionados().join(',') },
          }),
        ),
      );
    } catch {
      this.error.set('periodoCensal.errorComparar');
      this.resultado.set([]);
    } finally {
      this.cargando.set(false);
    }
  }

  /** Polilínea SVG minimalista (serie de tiempo) para "crecimiento poblacional" (RF-10-02: "gráficos de series de tiempo"). */
  puntosGrafico(comunidad: ComparacionComunidadApi): string {
    const valores = comunidad.puntos.map((p) => p.poblacionTotal ?? 0);
    const maximo = Math.max(...valores, 1);
    const paso = valores.length > 1 ? ANCHO_GRAFICO / (valores.length - 1) : 0;
    return valores
      .map((valor, indice) => {
        const x = indice * paso;
        const y = ALTO_GRAFICO - (valor / maximo) * ALTO_GRAFICO;
        return `${x},${y}`;
      })
      .join(' ');
  }

  readonly anchoGrafico = ANCHO_GRAFICO;
  readonly altoGrafico = ALTO_GRAFICO;
}
