import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppDatabase, HabitanteOffline, HogarOffline } from '@censo/web-shared-data-access';

interface HogarApi {
  id: number;
  uuid: string;
  comunidadId: number;
  periodoCensalId: number;
  estado: string;
  motivoBaja: string | null;
  direccionReferencia: string | null;
  consentimientoInformado: boolean;
  consentimientoFecha: string | null;
  jefeHogarId: number | null;
}

interface HabitanteApi {
  id: number;
  uuid: string;
  hogarId: number;
  comunidadId: number;
  periodoCensalId: number;
  estado: string;
  nombres: string;
  apellidos: string;
  tipoDocumentoId: number | null;
  numeroDocumento?: string;
  fechaNacimiento: string;
  sexo: string;
  consentimientoInformado: boolean;
  consentimientoFecha: string | null;
}

/**
 * Descarga a una caché local de solo lectura los hogares y habitantes ya
 * sincronizados de una comunidad, para que la alerta de duplicados
 * (RF-01-05, DeteccionDuplicadosService) funcione contra el universo real de
 * la comunidad y no solo contra lo capturado en el dispositivo actual. Nunca
 * sobrescribe una fila local pendiente de sincronizar (`origen: 'local'`).
 */
@Injectable({ providedIn: 'root' })
export class HabitantesPullService {
  constructor(
    private readonly http: HttpClient,
    private readonly db: AppDatabase,
  ) {}

  async actualizar(comunidadId: number): Promise<void> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const hogarUuidPorId = await this.actualizarHogares(comunidadId);
      await this.actualizarHabitantes(comunidadId, hogarUuidPorId);
    } catch {
      // Sin respuesta del servidor: se continúa con lo que haya en caché local.
    }
  }

  private async actualizarHogares(comunidadId: number): Promise<Map<number, string>> {
    const hogaresApi = await firstValueFrom(
      this.http.get<HogarApi[]>('/api/poblacion/hogares', { params: { comunidadId } }),
    );

    await this.db.transaction('rw', this.db.hogares, async () => {
      for (const hogar of hogaresApi) {
        const local = await this.db.hogares.get(hogar.uuid);
        if (local?.origen === 'local') {
          continue;
        }
        await this.db.hogares.put(this.aHogarOffline(hogar));
      }
    });

    return new Map(hogaresApi.map((hogar) => [hogar.id, hogar.uuid]));
  }

  private async actualizarHabitantes(comunidadId: number, hogarUuidPorId: Map<number, string>): Promise<void> {
    const habitantesApi = await firstValueFrom(
      this.http.get<HabitanteApi[]>('/api/poblacion/habitantes', { params: { comunidadId } }),
    );

    await this.db.transaction('rw', this.db.habitantes, async () => {
      for (const habitante of habitantesApi) {
        const hogarUuid = hogarUuidPorId.get(habitante.hogarId);
        if (!hogarUuid) {
          continue;
        }
        const local = await this.db.habitantes.get(habitante.uuid);
        if (local?.origen === 'local') {
          continue;
        }
        await this.db.habitantes.put(this.aHabitanteOffline(habitante, hogarUuid));
      }
    });
  }

  private aHogarOffline(hogar: HogarApi): HogarOffline {
    return {
      uuid: hogar.uuid,
      comunidadId: hogar.comunidadId,
      periodoCensalId: hogar.periodoCensalId,
      estado: hogar.estado,
      motivoBaja: hogar.motivoBaja,
      direccionReferencia: hogar.direccionReferencia,
      consentimientoInformado: hogar.consentimientoInformado,
      consentimientoFecha: hogar.consentimientoFecha,
      jefeHogarId: hogar.jefeHogarId,
      origen: 'servidor',
    };
  }

  private aHabitanteOffline(habitante: HabitanteApi, hogarUuid: string): HabitanteOffline {
    return {
      uuid: habitante.uuid,
      hogarUuid,
      comunidadId: habitante.comunidadId,
      periodoCensalId: habitante.periodoCensalId,
      estado: habitante.estado,
      nombres: habitante.nombres,
      apellidos: habitante.apellidos,
      tipoDocumentoId: habitante.tipoDocumentoId,
      numeroDocumento: habitante.numeroDocumento ?? null,
      fechaNacimiento: habitante.fechaNacimiento,
      sexo: habitante.sexo,
      consentimientoInformado: habitante.consentimientoInformado,
      consentimientoFecha: habitante.consentimientoFecha,
      origen: 'servidor',
    };
  }
}
