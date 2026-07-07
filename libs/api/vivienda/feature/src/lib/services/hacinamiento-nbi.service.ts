import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Vivienda, VivendaServicio } from '@censo/api-vivienda-data-access';
import { Habitante } from '@censo/api-poblacion-data-access';
import { HogarService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoServicio } from '@censo/shared-data-access';
import { calcularHacinamiento } from '@censo/shared-util';
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

/** Umbral estándar DANE de hacinamiento crítico: más de 3 personas por dormitorio. */
const UMBRAL_HACINAMIENTO_CRITICO = 3;

const CODIGOS_VIVIENDA_INADECUADA = ['choza_rancho'];
const CODIGOS_MATERIAL_INADECUADO = ['material_natural', 'tierra'];

/**
 * RF-04-01/02: hacinamiento y NBI se calculan EN VIVO por hogar (no vía vista
 * materializada) — a diferencia de los indicadores demográficos de Fase 2,
 * aquí no hay una noción de "artefacto de cierre de periodo": el propio
 * requerimiento pide que el hacinamiento se calcule "automáticamente"
 * (quedaría desactualizado tras cada alta/baja de habitante sin un REFRESH
 * manual). NBI es una versión simplificada (3 de los 5 componentes DANE
 * clásicos): los otros dos (dependencia económica, inasistencia escolar)
 * requieren módulos que aún no existen (Fases 5/6).
 */
@Injectable()
export class HacinamientoNbiService {
  constructor(
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
    @InjectRepository(Vivienda) private readonly viviendaRepository: Repository<Vivienda>,
    @InjectRepository(VivendaServicio) private readonly servicioRepository: Repository<VivendaServicio>,
    private readonly hogarService: HogarService,
  ) {}

  async calcularParaHogar(hogarId: number, usuario: UsuarioAutenticado): Promise<IndicadoresViviendaHogarDto> {
    const hogar = await this.hogarService.obtener(hogarId, usuario);
    if (hogar.viviendaId === null) {
      throw new NotFoundException(`El hogar ${hogarId} no tiene vivienda registrada`);
    }

    const vivienda = await this.viviendaRepository.findOne({
      where: { id: hogar.viviendaId },
      relations: { tipoVivienda: true, materialPared: true, materialPiso: true },
    });
    if (!vivienda) {
      throw new NotFoundException(`Vivienda ${hogar.viviendaId} no encontrada`);
    }

    const habitantesActivos = await this.habitanteRepository.count({
      where: { hogarId, estado: EstadoHabitante.ACTIVO },
    });

    const hacinamiento = calcularHacinamiento(habitantesActivos, vivienda.numeroDormitorios);
    const hacinamientoCritico = hacinamiento > UMBRAL_HACINAMIENTO_CRITICO;

    const viviendaInadecuada =
      CODIGOS_VIVIENDA_INADECUADA.includes(vivienda.tipoVivienda?.codigo ?? '') ||
      CODIGOS_MATERIAL_INADECUADO.includes(vivienda.materialPared?.codigo ?? '') ||
      CODIGOS_MATERIAL_INADECUADO.includes(vivienda.materialPiso?.codigo ?? '');

    const serviciosInadecuados = await this.tieneServiciosInadecuados(vivienda.id);

    return {
      hogarId,
      habitantesActivos,
      dormitorios: vivienda.numeroDormitorios,
      hacinamiento,
      hacinamientoCritico,
      viviendaInadecuada,
      serviciosInadecuados,
      tieneNbi: hacinamientoCritico || viviendaInadecuada || serviciosInadecuados,
    };
  }

  private async tieneServiciosInadecuados(viviendaId: number): Promise<boolean> {
    const servicios = await this.servicioRepository.find({ where: { viviendaId }, relations: { tipoServicio: true } });
    const buscar = (codigo: string) => servicios.find((s) => s.tipoServicio?.codigo === codigo);

    const agua = buscar('agua_potable');
    const saneamiento = buscar('saneamiento');

    return (agua?.estado ?? EstadoServicio.NO) !== EstadoServicio.SI || (saneamiento?.estado ?? EstadoServicio.NO) !== EstadoServicio.SI;
  }
}
