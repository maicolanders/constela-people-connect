import { EstadoPeriodo } from '@censo/shared-data-access';

/**
 * Contrato que desacopla libs/api/shared/feature (domain:shared) del dominio
 * periodo-censal: el guard de periodo abierto depende de esta interfaz, no
 * del servicio concreto, para respetar los depConstraints de Nx (domain:shared
 * solo depende de domain:shared). libs/api/periodo-censal/feature provee la
 * implementación real y la registra bajo este token.
 */
export interface PeriodoEstadoProvider {
  obtenerEstado(periodoCensalId: number): Promise<EstadoPeriodo>;
}

export const PERIODO_ESTADO_PROVIDER = Symbol('PERIODO_ESTADO_PROVIDER');
