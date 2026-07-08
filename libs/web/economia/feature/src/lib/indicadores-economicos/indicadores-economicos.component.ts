import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { SexoHabitante } from '@censo/shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

export interface DistribucionOcupacionalApi {
  ocupacionCatalogoItemId: number;
  total: number | null;
  suprimido: boolean;
}

export interface IndicadoresEconomicosApi {
  comunidadId: number;
  periodoCensalId: number;
  poblacionConDato: number;
  tasaDesempleo: number | null;
  distribucionOcupacional: DistribucionOcupacionalApi[];
}

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

/** RF-06-02: tasa de desempleo y distribución ocupacional, filtrable por sexo. */
@Component({
  selector: 'app-indicadores-economicos',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './indicadores-economicos.component.html',
})
export class IndicadoresEconomicosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly sexo = signal<SexoHabitante | ''>('');
  readonly indicadores = signal<IndicadoresEconomicosApi | null>(null);
  readonly sexos = Object.values(SexoHabitante);

  async ngOnInit(): Promise<void> {
    const [usuario, comunidades, periodos] = await Promise.all([
      this.authService.obtenerPerfil(),
      firstValueFrom(this.http.get<ComunidadOpcion[]>('/api/comunidades')),
      firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales')),
    ]);

    this.comunidades.set(comunidades);
    this.periodos.set(periodos);

    const comunidadAsignada = usuario.asignaciones.find((asignacion) => asignacion.comunidadId !== null)?.comunidadId;
    this.comunidadId.set(comunidadAsignada ?? comunidades[0]?.id ?? null);
    this.periodoCensalId.set(periodos[0]?.id ?? null);

    await this.recargar();
  }

  async recargar(): Promise<void> {
    const comunidadId = this.comunidadId();
    const periodoCensalId = this.periodoCensalId();
    this.error.set(null);

    if (comunidadId === null || periodoCensalId === null) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    try {
      const params: Record<string, string | number> = { comunidadId, periodoCensalId };
      if (this.sexo()) {
        params['sexo'] = this.sexo();
      }
      this.indicadores.set(
        await firstValueFrom(this.http.get<IndicadoresEconomicosApi>('/api/economia/indicadores', { params })),
      );
    } catch {
      this.indicadores.set(null);
      this.error.set('economia.errorCargarIndicadores');
    } finally {
      this.cargando.set(false);
    }
  }

  onComunidadChange(valor: string): void {
    this.comunidadId.set(Number(valor));
    void this.recargar();
  }

  onPeriodoChange(valor: string): void {
    this.periodoCensalId.set(Number(valor));
    void this.recargar();
  }

  onSexoChange(valor: string): void {
    this.sexo.set(valor as SexoHabitante | '');
    void this.recargar();
  }

  exportarCsv(): void {
    const indicadores = this.indicadores();
    if (!indicadores) {
      return;
    }
    const csv = generarCsv([indicadores as unknown as Record<string, unknown>]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'indicadores-economicos.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
