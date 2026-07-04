import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { PERIODO_ESTADO_PROVIDER, PeriodoEstadoProvider } from '@censo/api-shared-data-access';
import { EstadoPeriodo } from '@censo/shared-data-access';
import { Request } from 'express';

/**
 * Bloquea rutas de escritura sobre un periodo censal que no esté abierto
 * (RF-10-01). Busca `periodoCensalId` en params, body o query, en ese orden.
 * No implementa la excepción administrativa con justificación: esa lógica
 * vive en PeriodoCensalService.assertAbierto(), usado explícitamente por los
 * servicios de dominio que sí necesitan permitir la corrección excepcional.
 */
@Injectable()
export class PeriodoAbiertoGuard implements CanActivate {
  constructor(@Inject(PERIODO_ESTADO_PROVIDER) private readonly periodoEstadoProvider: PeriodoEstadoProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const periodoCensalId = this.extraerPeriodoCensalId(request);

    if (periodoCensalId === null) {
      return true;
    }

    const estado = await this.periodoEstadoProvider.obtenerEstado(periodoCensalId);
    if (estado !== EstadoPeriodo.ABIERTO) {
      throw new ForbiddenException('El periodo censal no está abierto para registrar o modificar información');
    }

    return true;
  }

  private extraerPeriodoCensalId(request: Request): number | null {
    const candidato =
      (request.params as Record<string, string>)?.['periodoCensalId'] ??
      (request.body as Record<string, unknown>)?.['periodoCensalId'] ??
      (request.query as Record<string, string>)?.['periodoCensalId'];

    const id = Number(candidato);
    return Number.isFinite(id) && candidato !== undefined ? id : null;
  }
}
