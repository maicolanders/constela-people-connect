import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vivienda, VivendaServicio } from '@censo/api-vivienda-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { HogarService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoServicio } from '@censo/shared-data-access';
import { calcularNbi } from '@censo/shared-util';
import { Repository } from 'typeorm';

export interface IndicadoresViviendaHogarDto {
  hogarId: number;
  habitantesActivos: number;
  dormitorios: number;
  hacinamiento: number;
  hacinamientoCritico: boolean;
  viviendaInadecuada: boolean;
  serviciosInadecuados: boolean;
  tieneNbi: boolean;
}

/**
 * RF-04-01/02: hacinamiento y NBI se calculan EN VIVO por hogar (no vía vista
 * materializada) — a diferencia de los indicadores demográficos de Fase 2,
 * aquí no hay una noción de "artefacto de cierre de periodo": el propio
 * requerimiento pide que el hacinamiento se calcule "automáticamente"
 * (quedaría desactualizado tras cada alta/baja de habitante sin un REFRESH
 * manual). NBI es una versión simplificada (3 de los 5 componentes DANE
 * clásicos): los otros dos (dependencia económica, inasistencia escolar)
 * requieren módulos que aún no existen (Fases 5/6). La fórmula (`calcularNbi`)
 * vive en `shared/util` desde Fase 9 para que `IndicadoresRecursosService`
 * (que no puede depender de `domain:vivienda`) la reutilice sin duplicarla.
 */
@Injectable()
export class HacinamientoNbiService {
  constructor(
    @InjectRepository(Habitante)
    private readonly habitanteRepository: Repository<Habitante>,
    @InjectRepository(Vivienda)
    private readonly viviendaRepository: Repository<Vivienda>,
    @InjectRepository(VivendaServicio)
    private readonly servicioRepository: Repository<VivendaServicio>,
    private readonly hogarService: HogarService,
  ) {}

  async calcularParaHogar(
    hogarId: number,
    usuario: UsuarioAutenticado,
  ): Promise<IndicadoresViviendaHogarDto> {
    const hogar = await this.hogarService.obtener(hogarId, usuario);
    if (hogar.viviendaId === null) {
      throw new NotFoundException(
        `El hogar ${hogarId} no tiene vivienda registrada`,
      );
    }

    const vivienda = await this.viviendaRepository.findOne({
      where: { id: hogar.viviendaId },
      relations: {
        tipoVivienda: true,
        materialPared: true,
        materialPiso: true,
      },
    });
    if (!vivienda) {
      throw new NotFoundException(`Vivienda ${hogar.viviendaId} no encontrada`);
    }

    const habitantesActivos = await this.habitanteRepository.count({
      where: { hogarId, estado: EstadoHabitante.ACTIVO },
    });

    const { agua, saneamiento } = await this.obtenerEstadoServiciosBasicos(
      vivienda.id,
    );

    const resultado = calcularNbi({
      habitantesActivos,
      numeroDormitorios: vivienda.numeroDormitorios,
      tipoViviendaCodigo: vivienda.tipoVivienda?.codigo,
      materialParedCodigo: vivienda.materialPared?.codigo,
      materialPisoCodigo: vivienda.materialPiso?.codigo,
      aguaPotableAdecuada: agua === EstadoServicio.SI,
      saneamientoAdecuado: saneamiento === EstadoServicio.SI,
    });

    return {
      hogarId,
      habitantesActivos,
      dormitorios: vivienda.numeroDormitorios,
      ...resultado,
    };
  }

  private async obtenerEstadoServiciosBasicos(
    viviendaId: number,
  ): Promise<{ agua: EstadoServicio; saneamiento: EstadoServicio }> {
    const servicios = await this.servicioRepository.find({
      where: { viviendaId },
      relations: { tipoServicio: true },
    });
    const buscar = (codigo: string) =>
      servicios.find((s) => s.tipoServicio?.codigo === codigo);

    return {
      agua: buscar('agua_potable')?.estado ?? EstadoServicio.NO,
      saneamiento: buscar('saneamiento')?.estado ?? EstadoServicio.NO,
    };
  }
}
