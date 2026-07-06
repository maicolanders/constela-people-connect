import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { EstadoHabitante } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity, calcularEdad, calcularGrupoQuinquenal } from '@censo/shared-util';

export interface BucketPiramide {
  grupoQuinquenal: string;
  sexo: string;
  total: number | null;
  suprimido: boolean;
}

/** Los 17 grupos quinquenales (0-4 ... 80+), derivados de la misma función que agrupa cada habitante. */
const GRUPOS_QUINQUENALES = Array.from({ length: 17 }, (_, indice) => calcularGrupoQuinquenal(indice * 5));

/**
 * RF-02-02: intenta primero el endpoint del backend (calcula la edad contra
 * `fechaCierre` si el periodo ya cerró, o contra hoy si sigue abierto, y
 * aplica la anonimización RT-05 con autoridad); si no hay conexión, calcula
 * localmente contra la caché offline usando siempre la fecha actual como
 * referencia (aproximación razonable para el caso de uso de campo: un
 * periodo cerrado se consulta normalmente desde una oficina con conexión).
 */
@Injectable({ providedIn: 'root' })
export class PiramidePoblacionalService {
  constructor(
    private readonly http: HttpClient,
    private readonly habitantesOffline: HabitantesOfflineService,
  ) {}

  async obtener(comunidadId: number, periodoCensalId: number): Promise<BucketPiramide[]> {
    try {
      return await firstValueFrom(
        this.http.get<BucketPiramide[]>('/api/demografia/piramide', { params: { comunidadId, periodoCensalId } }),
      );
    } catch {
      return this.calcularLocal(comunidadId, periodoCensalId);
    }
  }

  private async calcularLocal(comunidadId: number, periodoCensalId: number): Promise<BucketPiramide[]> {
    const habitantes = (await this.habitantesOffline.listarPorComunidad(comunidadId)).filter(
      (habitante) => habitante.periodoCensalId === periodoCensalId && habitante.estado === EstadoHabitante.ACTIVO,
    );

    const conteos = new Map<string, number>();
    for (const habitante of habitantes) {
      const edad = calcularEdad(new Date(habitante.fechaNacimiento), new Date());
      const grupo = calcularGrupoQuinquenal(edad);
      const clave = `${grupo}|${habitante.sexo}`;
      conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
    }

    const sexos = [...new Set(habitantes.map((habitante) => habitante.sexo))].sort();
    const filas = GRUPOS_QUINQUENALES.flatMap((grupoQuinquenal) =>
      sexos.map((sexo) => ({ grupoQuinquenal, sexo, total: conteos.get(`${grupoQuinquenal}|${sexo}`) ?? 0 })),
    );

    return aplicarAnonimizacionKAnonimity(filas) as unknown as BucketPiramide[];
  }
}
