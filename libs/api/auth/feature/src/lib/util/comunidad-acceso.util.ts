import { AsignacionRolUsuario } from '@censo/api-auth-data-access';
import { RolCodigo } from '@censo/shared-data-access';

/**
 * Resuelve a qué comunidades tiene acceso un usuario según sus asignaciones,
 * opcionalmente filtradas por los roles requeridos por la ruta/operación.
 * 'global' significa sin restricción (alguna asignación aplicable tiene
 * comunidadId null, p.ej. analista o administrador). Reutilizado tanto por
 * ComunidadScopeGuard (rutas con comunidadId en params/body/query) como por
 * servicios de dominio que necesitan acotar un listado o validar acceso a un
 * registro ya cargado (rutas por :id sin comunidadId explícito en la URL).
 */
export function comunidadesPermitidas(
  asignaciones: AsignacionRolUsuario[],
  rolesRequeridos?: RolCodigo[],
): number[] | 'global' {
  const aplicables = asignaciones.filter(
    (asignacion) => !rolesRequeridos || rolesRequeridos.length === 0 || rolesRequeridos.includes(asignacion.rol),
  );

  if (aplicables.some((asignacion) => asignacion.comunidadId === null)) {
    return 'global';
  }

  return aplicables.map((asignacion) => asignacion.comunidadId as number);
}

export function tieneAccesoComunidad(
  asignaciones: AsignacionRolUsuario[],
  comunidadId: number,
  rolesRequeridos?: RolCodigo[],
): boolean {
  const permitido = comunidadesPermitidas(asignaciones, rolesRequeridos);
  return permitido === 'global' || permitido.includes(comunidadId);
}
