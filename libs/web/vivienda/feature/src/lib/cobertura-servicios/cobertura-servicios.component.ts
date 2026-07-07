import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { generarCsv } from '@censo/shared-util';
import { TranslatePipe } from '@ngx-translate/core';

export interface CoberturaServicioApi {
  tipoServicioCatalogoItemId: number;
  tipoServicioCodigo: string;
  totalViviendas: number | null;
  totalConAcceso: number | null;
  porcentajeCobertura: number | null;
  suprimido: boolean;
}

interface ComunidadOpcion {
  id: number;
  nombre: string;
}

interface PeriodoOpcion {
  id: number;
  nombre: string;
}

/** RF-04-03: % de viviendas con acceso a cada servicio básico, por comunidad+periodo. */
@Component({
  selector: 'app-cobertura-servicios',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './cobertura-servicios.component.html',
})
export class CoberturaServiciosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly cobertura = signal<CoberturaServicioApi[]>([]);

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
      this.cobertura.set(
        await firstValueFrom(
          this.http.get<CoberturaServicioApi[]>('/api/vivienda/cobertura', { params: { comunidadId, periodoCensalId } }),
        ),
      );
    } catch {
      this.cobertura.set([]);
      this.error.set('vivienda.errorCargarCobertura');
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
    const filas = this.cobertura();
    if (filas.length === 0) {
      return;
    }
    const csv = generarCsv(filas as unknown as Record<string, unknown>[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'cobertura-servicios.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }
}
