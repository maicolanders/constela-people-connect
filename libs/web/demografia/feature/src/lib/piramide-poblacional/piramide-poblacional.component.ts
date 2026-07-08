import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { BucketPiramide, PiramidePoblacionalService } from '@censo/web-demografia-data-access';
import { SexoHabitante } from '@censo/shared-data-access';
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

interface FilaPiramide {
  grupoQuinquenal: string;
  masculino: number | null;
  masculinoSuprimido: boolean;
  femenino: number | null;
  femeninoSuprimido: boolean;
}

interface FilaPiramideVista extends FilaPiramide {
  y: number;
  masculinoAncho: number;
  masculinoX: number;
  femeninoAncho: number;
  femeninoX: number;
}

/** RF-02-02: pirámide poblacional (grupos quinquenales x sexo), filtrable por comunidad y periodo, exportable como imagen o datos. */
@Component({
  selector: 'app-piramide-poblacional',
  standalone: true,
  imports: [TranslatePipe, RouterLink],
  templateUrl: './piramide-poblacional.component.html',
})
export class PiramidePoblacionalComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly piramideService = inject(PiramidePoblacionalService);

  readonly ROW_HEIGHT = 22;
  readonly HALF_WIDTH = 220;
  readonly CENTER_START = 220;
  readonly CENTER_END = 280;
  readonly CHART_WIDTH = 500;

  readonly cargando = signal(true);
  readonly comunidades = signal<ComunidadOpcion[]>([]);
  readonly periodos = signal<PeriodoOpcion[]>([]);
  readonly comunidadId = signal<number | null>(null);
  readonly periodoCensalId = signal<number | null>(null);
  readonly filas = signal<FilaPiramide[]>([]);

  readonly maximoEscala = computed(() => {
    const totales = this.filas().flatMap((fila) => [fila.masculino ?? 0, fila.femenino ?? 0]);
    return Math.max(1, ...totales);
  });

  readonly alturaSvg = computed(() => Math.max(this.filas().length * this.ROW_HEIGHT, this.ROW_HEIGHT));

  readonly filasVista = computed<FilaPiramideVista[]>(() => {
    const maximo = this.maximoEscala();
    return [...this.filas()].reverse().map((fila, indice) => {
      const masculinoAncho = ((fila.masculino ?? 0) / maximo) * this.HALF_WIDTH;
      const femeninoAncho = ((fila.femenino ?? 0) / maximo) * this.HALF_WIDTH;
      return {
        ...fila,
        y: indice * this.ROW_HEIGHT,
        masculinoAncho,
        masculinoX: this.CENTER_START - masculinoAncho,
        femeninoAncho,
        femeninoX: this.CENTER_END,
      };
    });
  });

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
    if (comunidadId === null || periodoCensalId === null) {
      this.cargando.set(false);
      return;
    }

    this.cargando.set(true);
    const buckets = await this.piramideService.obtener(comunidadId, periodoCensalId);
    this.filas.set(this.aFilas(buckets));
    this.cargando.set(false);
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
    const csv = generarCsv(this.filas() as unknown as Record<string, unknown>[]);
    this.descargarBlob(new Blob([csv], { type: 'text/csv' }), 'piramide-poblacional.csv');
  }

  /** Angular tipa la referencia de plantilla de un <svg> como HTMLElement (no distingue el namespace SVG). */
  exportarImagen(svgElement: HTMLElement): void {
    const svgTexto = new XMLSerializer().serializeToString(svgElement);
    const svgUrl = URL.createObjectURL(new Blob([svgTexto], { type: 'image/svg+xml;charset=utf-8' }));
    const imagen = new Image();
    imagen.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = this.CHART_WIDTH;
      canvas.height = this.alturaSvg();
      canvas.getContext('2d')?.drawImage(imagen, 0, 0);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((blob) => {
        if (blob) {
          this.descargarBlob(blob, 'piramide-poblacional.png');
        }
      });
    };
    imagen.src = svgUrl;
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreArchivo;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private aFilas(buckets: BucketPiramide[]): FilaPiramide[] {
    const porGrupo = new Map<string, FilaPiramide>();
    for (const bucket of buckets) {
      const fila = porGrupo.get(bucket.grupoQuinquenal) ?? {
        grupoQuinquenal: bucket.grupoQuinquenal,
        masculino: 0,
        masculinoSuprimido: false,
        femenino: 0,
        femeninoSuprimido: false,
      };
      if (bucket.sexo === SexoHabitante.MASCULINO) {
        fila.masculino = bucket.total;
        fila.masculinoSuprimido = bucket.suprimido;
      } else if (bucket.sexo === SexoHabitante.FEMENINO) {
        fila.femenino = bucket.total;
        fila.femeninoSuprimido = bucket.suprimido;
      }
      porGrupo.set(bucket.grupoQuinquenal, fila);
    }
    return Array.from(porGrupo.values());
  }
}
