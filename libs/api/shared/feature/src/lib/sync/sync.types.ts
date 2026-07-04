export type OperacionSync = 'crear' | 'actualizar' | 'eliminar';

export interface SyncOperacionEntrada<T = Record<string, unknown>> {
  /** Identificador generado en el cliente al capturar (offline-first, ver CLAUDE.md/plan Fase 0.6). */
  uuid: string;
  operacion: OperacionSync;
  /** Marca de tiempo (ISO) del último pull/edición local, usada para el auto-merge. */
  actualizadoEnCliente: string;
  payload: T;
}

export type EstadoResultadoSync = 'aplicado' | 'conflicto' | 'error';

export interface SyncResultadoOperacion {
  uuid: string;
  estado: EstadoResultadoSync;
  mensaje?: string;
  /** Versión resultante en el servidor: la entidad aplicada, o la del servidor en caso de conflicto. */
  entidad?: Record<string, unknown>;
}

/**
 * Cada dominio capturable offline implementa este contrato y se registra en
 * SyncHandlerRegistry bajo su propio nombre de dominio (p.ej. 'hogares').
 * Estrategia de conflictos (híbrida, ver plan Fase 0): si el registro del
 * servidor no cambió desde `actualizadoEnCliente`, se aplica automáticamente;
 * si cambió, el handler debe devolver estado 'conflicto' con la versión del
 * servidor para que el frontend resuelva manualmente.
 */
export interface DomainSyncHandler {
  aplicarLote(operaciones: SyncOperacionEntrada[], usuarioId: number | null): Promise<SyncResultadoOperacion[]>;
}
