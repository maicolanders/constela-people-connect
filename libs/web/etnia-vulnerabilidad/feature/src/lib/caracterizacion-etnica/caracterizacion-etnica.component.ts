import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';

export interface ConteoCategoriaApi {
  categoria: string;
  total: number | null;
  suprimido: boolean;
}

export interface CaracterizacionEtnicaApi {
  comunidadId: number | null;
  periodoCensalId: number;
  totalHabitantes: number;
  porEtnia: ConteoCategoriaApi[];
  porCondicionVulnerabilidad: ConteoCategoriaApi[];
}

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

/**
 * RF-08-03: caracterización étnica y de vulnerabilidad. `comunidadId` es
 * opcional a propósito (ver `CaracterizacionEtnicaService`, backend): el
 * valor "" del select se interpreta como consolidado nacional/todas las
 * comunidades permitidas — no se implementa un concepto de "región" propio.
 */
@Component({
  selector: 'app-caracterizacion-etnica',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './caracterizacion-etnica.component.html',
})
export class CaracterizacionEtnicaComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly resultado = signal<CaracterizacionEtnicaApi | null>(null);

  async ngOnInit(): Promise<void> {
    const [usuario, comunidades, periodos] = await Promise.all([
      this.authService.obtenerPerfil(),
      firstValueFrom(this.http.get<ComunidadOpcion[]>('/api/comunidades')),
      firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales')),
    ]);
    this.comunidades.set(comunidades);
    this.periodos.set(periodos);

    const comunidadAsignada = usuario.asignaciones.find(
      (asignacion) => asignacion.comunidadId !== null,
    )?.comunidadId;
    this.comunidadId.set(comunidadAsignada ?? null);
    this.periodoCensalId.set(periodos[0]?.id ?? null);

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
      const params: Record<string, string | number> = { periodoCensalId };
      const comunidadId = this.comunidadId();
      if (comunidadId !== null) {
        params['comunidadId'] = comunidadId;
      }
      this.resultado.set(
        await firstValueFrom(
          this.http.get<CaracterizacionEtnicaApi>(
            '/api/etnia-vulnerabilidad/reportes/caracterizacion',
            { params },
          ),
        ),
      );
    } catch {
      this.resultado.set(null);
      this.error.set('etniaVulnerabilidad.errorCargarReporte');
    } finally {
      this.cargando.set(false);
    }
  }

  onComunidadChange(valor: string): void {
    this.comunidadId.set(valor ? Number(valor) : null);
    void this.recargar();
  }

  onPeriodoChange(valor: string): void {
    this.periodoCensalId.set(Number(valor));
    void this.recargar();
  }

  exportarCsv(): void {
    const resultado = this.resultado();
    if (!resultado) {
      return;
    }
    const filas = [
      ...resultado.porEtnia.map((fila) => ({ tipo: 'etnia', ...fila })),
      ...resultado.porCondicionVulnerabilidad.map((fila) => ({
        tipo: 'condicion_vulnerabilidad',
        ...fila,
      })),
    ];
    if (filas.length === 0) {
      return;
    }
    const csv = generarCsv(filas as unknown as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'caracterizacion-etnica.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
