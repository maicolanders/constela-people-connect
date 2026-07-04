import { RolCodigo } from '@censo/shared-data-access';

export interface AsignacionRolUsuario {
  rol: RolCodigo;
  /** null = asignación global (todas las comunidades), p.ej. analista o administrador. */
  comunidadId: number | null;
}

/**
 * Forma de `request.user` tras pasar JwtAuthGuard. Incluye `roles` (lista
 * plana de códigos) además de `asignaciones` (rol+comunidad detallado) para
 * que interceptores genéricos de libs/api/shared (domain:shared, que no
 * puede importar domain:auth) puedan seguir leyendo `user.roles` por
 * duck-typing sin conocer esta interfaz.
 */
export interface UsuarioAutenticado {
  id: number;
  email: string;
  roles: RolCodigo[];
  asignaciones: AsignacionRolUsuario[];
}
