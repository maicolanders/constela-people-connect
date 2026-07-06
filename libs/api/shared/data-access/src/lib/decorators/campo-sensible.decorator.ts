import 'reflect-metadata';
import { RolCodigo } from '@censo/shared-data-access';

export const CAMPO_SENSIBLE_METADATA_KEY = 'censo:campos-sensibles';

export type CategoriaCampoSensible =
  | 'etnia'
  | 'salud'
  | 'ingresos'
  | 'ubicacion-exacta'
  | 'documento-identidad'
  | 'identidad-genero';

export interface CampoSensibleOptions {
  categoria: CategoriaCampoSensible;
  /**
   * Roles que ven el valor real del campo además de administrador. Si se omite,
   * solo administrador lo ve (comportamiento por defecto, retrocompatible).
   */
  rolesPermitidos?: RolCodigo[];
}

/**
 * Marca una propiedad de entidad/DTO como dato sensible (CLAUDE.md: etnia,
 * salud/discapacidad, ingresos, ubicación exacta, documento). No cambia el
 * comportamiento por sí sola: SensitiveFieldsInterceptor (libs/api/shared/feature)
 * lee esta metadata para decidir si redacta el campo según el rol del solicitante.
 */
export function CampoSensible(options: CampoSensibleOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const ctor = target.constructor;
    const existing: Record<string, CampoSensibleOptions> = Reflect.getOwnMetadata(CAMPO_SENSIBLE_METADATA_KEY, ctor) ?? {};
    existing[propertyKey.toString()] = options;
    Reflect.defineMetadata(CAMPO_SENSIBLE_METADATA_KEY, existing, ctor);
  };
}

export function getCamposSensibles(target: new (...args: never[]) => unknown): Record<string, CampoSensibleOptions> {
  return Reflect.getMetadata(CAMPO_SENSIBLE_METADATA_KEY, target) ?? {};
}
