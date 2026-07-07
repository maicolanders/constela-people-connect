import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VivendaServicio } from '@censo/api-vivienda-data-access';
import { HogarService } from '@censo/api-poblacion-feature';
import { CatalogoService } from '@censo/api-catalogo-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoServicio } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity } from '@censo/shared-util';
import { In, Repository } from 'typeorm';

export interface CoberturaServicioDto {
  tipoServicioCatalogoItemId: number;
  tipoServicioCodigo: string;
  totalViviendas: number | null;
  totalConAcceso: number | null;
  porcentajeCobertura: number | null;
  suprimido: boolean;
}

/**
 * RF-04-03: % de viviendas con acceso ('sí') a cada servicio básico, agrupado
 * por comunidad+periodo. Calculado en vivo (no hay condición de "solo
 * periodos cerrados" que justifique una vista materializada aquí, a
 * diferencia de los indicadores demográficos de Fase 2).
 */
@Injectable()
export class CoberturaServiciosService {
  constructor(
    @InjectRepository(VivendaServicio) private readonly servicioRepository: Repository<VivendaServicio>,
    private readonly catalogoService: CatalogoService,
    private readonly hogarService: HogarService,
  ) {}

  async obtenerCobertura(
    usuario: UsuarioAutenticado,
    comunidadId: number,
    periodoCensalId: number,
  ): Promise<CoberturaServicioDto[]> {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }

    const hogares = await this.hogarService.listar(usuario, { comunidadId, periodoCensalId });
    const viviendaIds = hogares.map((hogar) => hogar.viviendaId).filter((id): id is number => id !== null);
    const totalViviendas = viviendaIds.length;

    const tiposServicio = await this.catalogoService.listarItemsPorTipo('tipo_servicio_vivienda');

    const servicios = viviendaIds.length > 0
      ? await this.servicioRepository.find({ where: { viviendaId: In(viviendaIds) } })
      : [];

    const filas = tiposServicio.map((tipo) => ({
      tipoServicioCatalogoItemId: tipo.id,
      tipoServicioCodigo: tipo.codigo,
      total: totalViviendas,
      totalConAcceso: servicios.filter((s) => s.tipoServicioCatalogoItemId === tipo.id && s.estado === EstadoServicio.SI)
        .length,
    }));

    return aplicarAnonimizacionKAnonimity(filas).map((fila) => ({
      tipoServicioCatalogoItemId: fila['tipoServicioCatalogoItemId'] as number,
      tipoServicioCodigo: fila['tipoServicioCodigo'] as string,
      totalViviendas: fila.total,
      totalConAcceso: fila.suprimido ? null : (fila['totalConAcceso'] as number),
      porcentajeCobertura:
        fila.suprimido || fila.total === 0 || fila.total === null
          ? null
          : Math.round(((fila['totalConAcceso'] as number) / fila.total) * 1000) / 10,
      suprimido: fila.suprimido,
    }));
  }
}
