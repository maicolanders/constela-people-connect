import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { IndicadoresDemograficosApi, IndicadoresDemograficosService } from '@censo/web-demografia-data-access';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
  estado: string;
}

/** RF-02-03: indicadores demográficos, solo disponibles para periodos cerrados ("se recalculan al cerrar el periodo"). */
@Component({
  selector: 'app-indicadores-demograficos',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './indicadores-demograficos.component.html',
})
export class IndicadoresDemograficosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly indicadoresService = inject(IndicadoresDemograficosService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodosCerrados = signal<PeriodoOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly indicadores = signal<IndicadoresDemograficosApi | null>(null);

  async ngOnInit(): Promise<void> {
    const [usuario, comunidades, periodos] = await Promise.all([
      this.authService.obtenerPerfil(),
      firstValueFrom(this.http.get<ComunidadOpcion[]>('/api/comunidades')),
      firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales')),
    ]);

    this.comunidades.set(comunidades);
    this.periodosCerrados.set(periodos.filter((periodo) => periodo.estado === 'cerrado'));

    const comunidadAsignada = usuario.asignaciones.find((asignacion) => asignacion.comunidadId !== null)?.comunidadId;
    this.comunidadId.set(comunidadAsignada ?? comunidades[0]?.id ?? null);
    this.periodoCensalId.set(this.periodosCerrados()[0]?.id ?? null);

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
      this.indicadores.set(await this.indicadoresService.obtener(comunidadId, periodoCensalId));
    } catch {
      this.indicadores.set(null);
      this.error.set('demografia.indicadoresNoDisponibles');
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
    enlace.download = 'indicadores-demograficos.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
