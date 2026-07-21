/** Lo que termina en `request.user` para una request autenticada como habitante (Fase 14). */
export interface HabitanteAutenticado {
  habitanteId: number;
  comunidadId: number;
  hogarId: number;
}
