import { Injectable } from '@angular/core';
import { AppDatabase } from '@censo/web-shared-data-access';
import { EstadoHabitante } from '@censo/shared-data-access';
import { calcularSimilitudHabitante, DatosComparablesHabitante, UMBRAL_POSIBLE_DUPLICADO } from '@censo/shared-util';

export interface CandidatoDuplicadoOffline {
  uuid: string;
  nombres: string;
  apellidos: string;
  score: number;
}

/**
 * RF-01-05, ejecutado enteramente contra la caché local (IndexedDB), para que
 * la alerta de posible duplicado funcione sin conexión. Usa exactamente el
 * mismo cálculo y umbral (`@censo/shared-util`) que `HabitanteService.
 * verificarDuplicados` en el backend, para que ambos nunca diverjan.
 */
@Injectable({ providedIn: 'root' })
export class DeteccionDuplicadosService {
  constructor(private readonly db: AppDatabase) {}

  async buscarCandidatos(datos: DatosComparablesHabitante): Promise<CandidatoDuplicadoOffline[]> {
    const candidatos = await this.db.habitantes.where('comunidadId').equals(datos.comunidadId).toArray();

    return candidatos
      .filter((habitante) => habitante.estado === EstadoHabitante.ACTIVO)
      .map((habitante) => ({
        uuid: habitante.uuid,
        nombres: habitante.nombres,
        apellidos: habitante.apellidos,
        score: calcularSimilitudHabitante(datos, {
          nombres: habitante.nombres,
          apellidos: habitante.apellidos,
          fechaNacimiento: new Date(habitante.fechaNacimiento),
          comunidadId: habitante.comunidadId,
        }),
      }))
      .filter((candidato) => candidato.score >= UMBRAL_POSIBLE_DUPLICADO)
      .sort((a, b) => b.score - a.score);
  }
}
