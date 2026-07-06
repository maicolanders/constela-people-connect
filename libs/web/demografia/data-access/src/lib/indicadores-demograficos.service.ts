import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface IndicadoresDemograficosApi {
  comunidadId: number;
  periodoCensalId: number;
  poblacionTotal: number | null;
  razonDependencia: number | null;
  indiceEnvejecimiento: number | null;
  tasaNatalidadAparente: number | null;
  tasaMortalidadAparente: number | null;
  suprimido: boolean;
}

/**
 * RF-02-03: los indicadores son un artefacto de cierre de periodo (dato
 * histórico de baja frecuencia), no se cachea offline — a diferencia de la
 * pirámide, siempre requiere conexión.
 */
@Injectable({ providedIn: 'root' })
export class IndicadoresDemograficosService {
  constructor(private readonly http: HttpClient) {}

  obtener(comunidadId: number, periodoCensalId: number): Promise<IndicadoresDemograficosApi> {
    return firstValueFrom(
      this.http.get<IndicadoresDemograficosApi>('/api/demografia/indicadores', {
        params: { comunidadId, periodoCensalId },
      }),
    );
  }
}
