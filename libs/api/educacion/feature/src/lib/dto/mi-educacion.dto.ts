import { HabitanteEducacion } from '@censo/api-educacion-data-access';

/**
 * Objeto plano de respuesta para autogestión (Fase 14) — nunca la entidad
 * TypeORM tal cual, mismo criterio que `MiPerfilDto` (poblacion/feature):
 * evita cualquier interacción con `SensitiveFieldsInterceptor`, cuya
 * redacción se basa en `request.user?.roles` (inexistente para un actor de
 * habitante).
 */
export interface MiEducacionDto {
  id: number;
  habitanteId: number;
  alfabetizado: boolean;
  nivelEducativoCatalogoItemId: number;
  asisteEscuela: boolean;
}

export function mapearMiEducacion(educacion: HabitanteEducacion): MiEducacionDto {
  return {
    id: educacion.id,
    habitanteId: educacion.habitanteId,
    alfabetizado: educacion.alfabetizado,
    nivelEducativoCatalogoItemId: educacion.nivelEducativoCatalogoItemId,
    asisteEscuela: educacion.asisteEscuela,
  };
}
