import { Injectable } from '@nestjs/common';

export interface PeriodoCierreHook {
  alCerrarPeriodo(periodoCensalId: number): Promise<void>;
}

/**
 * Registro genérico de acciones a ejecutar cuando un periodo censal se
 * cierra (p.ej. refrescar vistas materializadas de indicadores). Mismo
 * patrón que SyncHandlerRegistry: cada dominio (demografia, ...) se registra
 * aquí desde su propio módulo (onModuleInit) en vez de que
 * domain:periodo-censal importe dominios concretos, lo cual violaría los
 * depConstraints de Nx (periodo-censal no puede depender de demografia).
 */
@Injectable()
export class PeriodoCierreHookRegistry {
  private readonly hooks: PeriodoCierreHook[] = [];

  registrar(hook: PeriodoCierreHook): void {
    this.hooks.push(hook);
  }

  async ejecutarTodos(periodoCensalId: number): Promise<void> {
    for (const hook of this.hooks) {
      await hook.alCerrarPeriodo(periodoCensalId);
    }
  }
}
