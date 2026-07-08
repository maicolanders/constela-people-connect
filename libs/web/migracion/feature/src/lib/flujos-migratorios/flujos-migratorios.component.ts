import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, CatalogoItemCache, CatalogoOfflineService } from '@censo/web-shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';

export interface FlujoOrigenDestinoApi {
  origen: string;
  destino: string;
  total: number | null;
  suprimido: boolean;
}

export interface FlujosMigratoriosApi {
  comunidadId: number;
  periodoCensalId: number;
  totalEntradas: number | null;
  totalSalidas: number | null;
  saldoNeto: number | null;
  flujos: FlujoOrigenDestinoApi[];
}

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

/** RF-07-02: flujos de entrada/salida, saldo neto y tabla de flujos por origen→destino (no un mapa: ver nota en `FlujosMigratoriosService`). */
@Component({
  selector: 'app-flujos-migratorios',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './flujos-migratorios.component.html',
})
export class FlujosMigratoriosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly catalogoOffline = inject(CatalogoOfflineService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly motivos = signal<CatalogoItemCache[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly motivoCatalogoItemId = signal<number | null>(null);
  readonly flujos = signal<FlujosMigratoriosApi | null>(null);

  async ngOnInit(): Promise<void> {
    const [usuario, comunidades, periodos, motivos] = await Promise.all([
      this.authService.obtenerPerfil(),
      firstValueFrom(this.http.get<ComunidadOpcion[]>('/api/comunidades')),
      firstValueFrom(this.http.get<PeriodoOpcion[]>('/api/periodos-censales')),
      this.catalogoOffline.obtenerItems('motivo_migracion'),
    ]);

    this.comunidades.set(comunidades);
    this.periodos.set(periodos);
    this.motivos.set(motivos);

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
      if (this.motivoCatalogoItemId()) {
        params['motivoCatalogoItemId'] = this.motivoCatalogoItemId() as number;
      }
      this.flujos.set(await firstValueFrom(this.http.get<FlujosMigratoriosApi>('/api/migracion/flujos', { params })));
    } catch {
      this.flujos.set(null);
      this.error.set('migracion.errorCargarFlujos');
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

  onMotivoChange(valor: string): void {
    this.motivoCatalogoItemId.set(valor ? Number(valor) : null);
    void this.recargar();
  }

  exportarCsv(): void {
    const flujos = this.flujos();
    if (!flujos || flujos.flujos.length === 0) {
      return;
    }
    const csv = generarCsv(flujos.flujos as unknown as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'flujos-migratorios.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
