import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ColaSincronizacionEntrada } from '../database/app-database';
import { SyncQueueService } from './sync-queue.service';

export interface ResultadoSincronizacionServidor {
  uuid: string;
  estado: 'aplicado' | 'conflicto' | 'error';
  mensaje?: string;
  entidad?: Record<string, unknown>;
}

/**
 * Único punto de sincronización offline->online (CLAUDE.md: "estrategia de
 * sincronización... centralizada en un servicio único"). Estrategia híbrida
 * de conflictos: el backend decide 'aplicado' (auto-merge, el servidor no
 * cambió desde la última lectura del cliente) o 'conflicto' (requiere
 * resolución manual, ver SyncQueueService.resolverConflictoManual).
 */
@Injectable({ providedIn: 'root' })
export class SyncService {
  readonly enLinea = signal(typeof navigator !== 'undefined' ? navigator.onLine : true);
  readonly sincronizando = signal(false);
  /** Registros locales que aún no quedaron aplicados en el servidor (pendientes, en error o en conflicto). */
  readonly pendientes = signal(0);

  constructor(
    private readonly http: HttpClient,
    private readonly syncQueue: SyncQueueService,
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.enLinea.set(true);
        void this.sincronizar();
      });
      window.addEventListener('offline', () => this.enLinea.set(false));
    }
    void this.actualizarPendientes();
  }

  /**
   * `forzarReintento` lo usa la acción manual "Sincronizar ahora": una
   * entrada en 'error' que ya agotó los reintentos automáticos
   * (MAX_INTENTOS_AUTOMATICOS) solo vuelve a intentarse cuando el usuario lo
   * pide explícitamente (ej. tras abrir un nuevo periodo censal, que fue la
   * causa real de los errores).
   */
  async sincronizar(forzarReintento = false): Promise<void> {
    if (!this.enLinea() || this.sincronizando()) {
      return;
    }

    this.sincronizando.set(true);
    try {
      const pendientes = await this.syncQueue.listarPendientes(forzarReintento);
      const porDominio = this.agruparPorDominio(pendientes);
      for (const [dominio, entradas] of porDominio) {
        await this.sincronizarDominio(dominio, entradas);
      }
    } finally {
      this.sincronizando.set(false);
      await this.actualizarPendientes();
    }
  }

  async actualizarPendientes(): Promise<void> {
    this.pendientes.set(await this.syncQueue.contarPendientes());
  }

  private agruparPorDominio(entradas: ColaSincronizacionEntrada[]): Map<string, ColaSincronizacionEntrada[]> {
    const mapa = new Map<string, ColaSincronizacionEntrada[]>();
    for (const entrada of entradas) {
      const lista = mapa.get(entrada.dominio) ?? [];
      lista.push(entrada);
      mapa.set(entrada.dominio, lista);
    }
    return mapa;
  }

  private async sincronizarDominio(dominio: string, entradas: ColaSincronizacionEntrada[]): Promise<void> {
    const cuerpo = entradas.map((entrada) => ({
      uuid: entrada.uuid,
      operacion: entrada.operacion,
      actualizadoEnCliente: entrada.actualizadoEnCliente,
      payload: entrada.payload,
    }));

    try {
      const resultados = await firstValueFrom(
        this.http.post<ResultadoSincronizacionServidor[]>(`/api/sync/${dominio}`, cuerpo),
      );
      await this.procesarResultados(entradas, resultados);
    } catch (error) {
      // Falla de red/servidor: la entrada sigue pendiente y se reintenta en el próximo ciclo.
      for (const entrada of entradas) {
        if (entrada.id !== undefined) {
          await this.syncQueue.marcarError(entrada.id, error instanceof Error ? error.message : 'Error de sincronización');
        }
      }
    }
  }

  private async procesarResultados(
    entradas: ColaSincronizacionEntrada[],
    resultados: ResultadoSincronizacionServidor[],
  ): Promise<void> {
    const porUuid = new Map(resultados.map((resultado) => [resultado.uuid, resultado]));

    for (const entrada of entradas) {
      if (entrada.id === undefined) continue;
      const resultado = porUuid.get(entrada.uuid);
      if (!resultado) continue;

      if (resultado.estado === 'aplicado') {
        await this.syncQueue.marcarSincronizado(entrada.id);
      } else if (resultado.estado === 'conflicto') {
        await this.syncQueue.marcarConflicto(entrada.id, resultado.entidad ?? {});
      } else {
        await this.syncQueue.marcarError(entrada.id, resultado.mensaje ?? 'Error desconocido en sincronización');
      }
    }
  }
}
