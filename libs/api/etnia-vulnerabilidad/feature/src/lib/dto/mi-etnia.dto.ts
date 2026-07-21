import { HabitanteCondicionVulnerabilidad, HabitanteEtnia } from '@censo/api-etnia-vulnerabilidad-data-access';

/**
 * Objetos planos de respuesta para autogestión (Fase 14) — nunca las
 * entidades TypeORM tal cual: `HabitanteEtnia`/`HabitanteCondicionVulnerabilidad`
 * tienen campos `@CampoSensible` (categorías 'etnia'/'salud') que
 * `SensitiveFieldsInterceptor` redactaría si se devolviera la entidad cruda
 * (el actor de habitante no tiene `roles`, vería sus propios datos como
 * `undefined`). "Editar salud" en esta fase = editar las condiciones de
 * vulnerabilidad propias vía `mapearMiCondicion`.
 */
export interface MiEtniaDto {
  id: number;
  habitanteId: number;
  etniaCatalogoItemId: number;
  lenguaMaternaCatalogoItemId: number | null;
  resguardoUbicacionGeograficaId: number | null;
}

export interface MiCondicionVulnerabilidadDto {
  id: number;
  habitanteId: number;
  condicionVulnerabilidadCatalogoItemId: number;
}

export function mapearMiEtnia(etnia: HabitanteEtnia): MiEtniaDto {
  return {
    id: etnia.id,
    habitanteId: etnia.habitanteId,
    etniaCatalogoItemId: etnia.etniaCatalogoItemId,
    lenguaMaternaCatalogoItemId: etnia.lenguaMaternaCatalogoItemId,
    resguardoUbicacionGeograficaId: etnia.resguardoUbicacionGeograficaId,
  };
}

export function mapearMiCondicion(condicion: HabitanteCondicionVulnerabilidad): MiCondicionVulnerabilidadDto {
  return {
    id: condicion.id,
    habitanteId: condicion.habitanteId,
    condicionVulnerabilidadCatalogoItemId: condicion.condicionVulnerabilidadCatalogoItemId,
  };
}
