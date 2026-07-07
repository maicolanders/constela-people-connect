import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HabitanteOcupacion } from '@censo/api-economia-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity, calcularEdad, calcularGrupoQuinquenal } from '@censo/shared-util';
import { In, Repository } from 'typeorm';
import { IndicadoresEconomicosQueryDto } from '../dto/indicadores-economicos-query.dto';

export interface DistribucionOcupacionalDto {
  ocupacionCatalogoItemId: number;
  total: number | null;
  suprimido: boolean;
}

export interface IndicadoresEconomicosDto {
  comunidadId: number;
  periodoCensalId: number;
  poblacionConDato: number;
  tasaDesempleo: number | null;
  distribucionOcupacional: DistribucionOcupacionalDto[];
}

/** Definición de PEA usada para la tasa de desempleo (RF-06-02 la pide "configurable"; este es el valor por defecto). */
const CODIGOS_PEA = ['ocupado', 'desempleado'];

/**
 * RF-06-02: en vivo (mismo criterio que hacinamiento/NBI, cobertura de
 * servicios e indicadores educativos de Fases 4/5) — no hay condición de
 * "solo periodos cerrados" en el requerimiento.
 */
@Injectable()
export class IndicadoresEconomicosService {
  constructor(
    @InjectRepository(HabitanteOcupacion) private readonly ocupacionRepository: Repository<HabitanteOcupacion>,
    private readonly habitanteService: HabitanteService,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  async obtener(usuario: UsuarioAutenticado, dto: IndicadoresEconomicosQueryDto): Promise<IndicadoresEconomicosDto> {
    if (!tieneAccesoComunidad(usuario.asignaciones, dto.comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }

    const periodo = await this.periodoCensalService.obtener(dto.periodoCensalId);
    const fechaReferencia = periodo.estado === EstadoPeriodo.CERRADO ? new Date(periodo.fechaCierre as string) : new Date();

    const habitantes = await this.habitanteService.listar(usuario, {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      estado: EstadoHabitante.ACTIVO,
    });

    const habitantesFiltrados = habitantes.filter((habitante) => {
      if (dto.sexo && habitante.sexo !== dto.sexo) {
        return false;
      }
      if (dto.grupoQuinquenal) {
        const edad = calcularEdad(new Date(habitante.fechaNacimiento), fechaReferencia);
        if (calcularGrupoQuinquenal(edad) !== dto.grupoQuinquenal) {
          return false;
        }
      }
      return true;
    });

    const habitanteIds = habitantesFiltrados.map((habitante) => habitante.id);
    const registros =
      habitanteIds.length > 0
        ? await this.ocupacionRepository.find({
            where: { habitanteId: In(habitanteIds) },
            relations: { condicionActividad: true },
          })
        : [];

    const poblacionConDato = registros.length;
    const enPea = registros.filter((r) => CODIGOS_PEA.includes(r.condicionActividad?.codigo ?? ''));
    const desempleados = enPea.filter((r) => r.condicionActividad?.codigo === 'desempleado');

    const ocupacionAgrupada = new Map<number, number>();
    for (const registro of registros) {
      if (registro.condicionActividad?.codigo === 'ocupado' && registro.ocupacionCatalogoItemId !== null) {
        ocupacionAgrupada.set(
          registro.ocupacionCatalogoItemId,
          (ocupacionAgrupada.get(registro.ocupacionCatalogoItemId) ?? 0) + 1,
        );
      }
    }
    const filasDistribucion = Array.from(ocupacionAgrupada.entries()).map(([ocupacionCatalogoItemId, total]) => ({
      ocupacionCatalogoItemId,
      total,
    }));

    return {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      poblacionConDato,
      tasaDesempleo: enPea.length > 0 ? Math.round((desempleados.length / enPea.length) * 1000) / 10 : null,
      distribucionOcupacional: aplicarAnonimizacionKAnonimity(filasDistribucion).map((fila) => ({
        ocupacionCatalogoItemId: fila['ocupacionCatalogoItemId'] as number,
        total: fila.total,
        suprimido: fila.suprimido,
      })),
    };
  }
}
