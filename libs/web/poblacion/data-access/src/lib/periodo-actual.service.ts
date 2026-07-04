import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface PeriodoCensalApi {
  id: number;
  estado: string;
}

const CLAVE_PERIODO_ACTUAL = 'censo.periodoAbiertoId';

/**
 * Resuelve el periodo censal abierto para los formularios de captura. Cachea
 * el último id resuelto en localStorage para que la captura offline siga
 * funcionando tras la primera vez que el dispositivo estuvo en línea.
 */
@Injectable({ providedIn: 'root' })
export class PeriodoActualService {
  constructor(private readonly http: HttpClient) {}

  async obtenerIdAbierto(): Promise<number | null> {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const periodos = await firstValueFrom(this.http.get<PeriodoCensalApi[]>('/api/periodos-censales'));
        const abierto = periodos.find((periodo) => periodo.estado === 'abierto') ?? null;
        if (abierto && typeof localStorage !== 'undefined') {
          localStorage.setItem(CLAVE_PERIODO_ACTUAL, String(abierto.id));
        }
        if (abierto) {
          return abierto.id;
        }
      } catch {
        // Sin respuesta del servidor: se continúa con el valor cacheado localmente.
      }
    }

    if (typeof localStorage === 'undefined') {
      return null;
    }
    const cacheado = localStorage.getItem(CLAVE_PERIODO_ACTUAL);
    return cacheado ? Number(cacheado) : null;
  }
}
