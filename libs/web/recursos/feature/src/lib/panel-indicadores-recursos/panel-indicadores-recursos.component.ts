import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';

export interface IndicadorComunidadApi {
  comunidadId: number;
  comunidadNombre: string;
  poblacionTotal: number | null;
  tasaNbi: number | null;
  coberturaEducativa: number | null;
  tasaVulnerabilidad: number | null;
  suprimido: boolean;
}

export interface IndicadoresRecursosApi {
  periodoCensalId: number;
  comunidades: IndicadorComunidadApi[];
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

type ColumnaOrdenable =
  | 'comunidadNombre'
  | 'poblacionTotal'
  | 'tasaNbi'
  | 'coberturaEducativa'
  | 'tasaVulnerabilidad';

/**
 * RF-09-01: panel de comparación entre comunidades para priorización
 * presupuestal. Restringido en el backend a ANALISTA/ADMINISTRADOR (ver
 * `RecursosController`) — sin guard de rol propio en el frontend (mismo
 * criterio que el resto de la app: el backend es la fuente de verdad de
 * autorización, el frontend solo muestra el error si el rol no alcanza).
 */
@Component({
  selector: 'app-panel-indicadores-recursos',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './panel-indicadores-recursos.component.html',
})
export class PanelIndicadoresRecursosComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly periodoCensalId = signal<number | null>(null);
  readonly resultado = signal<IndicadoresRecursosApi | null>(null);
  readonly columnaOrden = signal<ColumnaOrdenable>('comunidadNombre');
  readonly ordenAscendente = signal(true);

  readonly comunidadesOrdenadas = computed(() => {
    const datos = this.resultado();
    if (!datos) return [];
    const columna = this.columnaOrden();
    const factor = this.ordenAscendente() ? 1 : -1;
    return [...datos.comunidades].sort((a, b) => {
      const valorA = a[columna];
      const valorB = b[columna];
      if (valorA === null && valorB === null) return 0;
      if (valorA === null) return 1;
      if (valorB === null) return -1;
      if (typeof valorA === 'string' || typeof valorB === 'string') {
        return factor * String(valorA).localeCompare(String(valorB));
      }
      return factor * ((valorA as number) - (valorB as number));
    });
  });

  async ngOnInit(): Promise<void> {
    this.periodos.set(
      await firstValueFrom(
        this.http.get<PeriodoOpcion[]>('/api/periodos-censales'),
      ),
    );
    this.periodoCensalId.set(this.periodos()[0]?.id ?? null);
    await this.recargar();
  }

  async recargar(): Promise<void> {
    const periodoCensalId = this.periodoCensalId();
    this.error.set(null);

    if (periodoCensalId === null) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    try {
      this.resultado.set(
        await firstValueFrom(
          this.http.get<IndicadoresRecursosApi>('/api/recursos/indicadores', {
            params: { periodoCensalId },
          }),
        ),
      );
    } catch {
      this.resultado.set(null);
      this.error.set('recursos.errorCargarPanel');
    } finally {
      this.cargando.set(false);
    }
  }

  onPeriodoChange(valor: string): void {
    this.periodoCensalId.set(Number(valor));
    void this.recargar();
  }

  ordenarPor(columna: ColumnaOrdenable): void {
    if (this.columnaOrden() === columna) {
      this.ordenAscendente.update((valor) => !valor);
    } else {
      this.columnaOrden.set(columna);
      this.ordenAscendente.set(true);
    }
  }

  exportarCsv(): void {
    const filas = this.comunidadesOrdenadas();
    if (filas.length === 0) return;
    const csv = generarCsv(filas as unknown as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'indicadores-recursos.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
