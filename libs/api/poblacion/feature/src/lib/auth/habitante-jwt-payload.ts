/**
 * Payload del access token de autogestión del habitante (Fase 14). Deliberadamente
 * mínimo y denormalizado (comunidadId/hogarId ya viven en `Habitante`): a
 * diferencia del `JwtPayload` de staff, `HabitanteJwtStrategy.validate` SIEMPRE
 * relee el habitante desde BD (ver esa clase) en vez de confiar ciegamente en
 * este payload, porque `Habitante.estado` puede pasar a `baja` en cualquier
 * momento y debe invalidar la sesión de inmediato.
 */
export interface HabitanteJwtPayload {
  sub: number;
  comunidadId: number;
  hogarId: number;
}
