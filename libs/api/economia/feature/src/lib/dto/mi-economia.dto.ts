import { HabitanteOcupacion } from '@censo/api-economia-data-access';

/**
 * Objeto plano de respuesta para autogestión (Fase 14) — nunca la entidad
 * TypeORM tal cual: `HabitanteOcupacion.ingresoMensual` está marcado
 * `@CampoSensible({categoria:'ingresos'})`, y `SensitiveFieldsInterceptor`
 * redactaría ese campo si se devolviera la entidad cruda (el actor de
 * habitante no tiene `roles`, así que vería su propio ingreso como `undefined`).
 */
export interface MiEconomiaDto {
  id: number;
  habitanteId: number;
  condicionActividadCatalogoItemId: number;
  ocupacionCatalogoItemId: number | null;
  ingresoMensual: string | null;
}

export function mapearMiEconomia(ocupacion: HabitanteOcupacion): MiEconomiaDto {
  return {
    id: ocupacion.id,
    habitanteId: ocupacion.habitanteId,
    condicionActividadCatalogoItemId: ocupacion.condicionActividadCatalogoItemId,
    ocupacionCatalogoItemId: ocupacion.ocupacionCatalogoItemId,
    ingresoMensual: ocupacion.ingresoMensual,
  };
}
