import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HabitanteEducacion } from '@censo/api-educacion-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity, calcularEdad, calcularGrupoQuinquenal } from '@censo/shared-util';
import { In, Repository } from 'typeorm';
import { IndicadoresEducativosQueryDto } from '../dto/indicadores-educativos-query.dto';

export interface DistribucionNivelEducativoDto {
  nivelEducativoCatalogoItemId: number;
  total: number | null;
  suprimido: boolean;
}

export interface IndicadoresEducativosDto {
  comunidadId: number;
  periodoCensalId: number;
  poblacionConDato: number;
  tasaAlfabetismo: number | null;
  tasaAsistenciaEscolar: number | null;
  distribucionNivelEducativo: DistribucionNivelEducativoDto[];
}

/**
 * RF-05-02: calculado en vivo (mismo criterio que hacinamiento/NBI y
 * cobertura de servicios en Fase 4: no hay condición de "solo periodos
 * cerrados" en el requerimiento). Filtrable por sexo/grupo quinquenal
 * además de comunidad+periodo.
 */
@Injectable()
export class IndicadoresEducativosService {
  constructor(
    @InjectRepository(HabitanteEducacion) private readonly educacionRepository: Repository<HabitanteEducacion>,
    private readonly habitanteService: HabitanteService,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  async obtener(usuario: UsuarioAutenticado, dto: IndicadoresEducativosQueryDto): Promise<IndicadoresEducativosDto> {
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
    const registrosEducacion =
      habitanteIds.length > 0 ? await this.educacionRepository.find({ where: { habitanteId: In(habitanteIds) } }) : [];

    const poblacionConDato = registrosEducacion.length;
    const alfabetizados = registrosEducacion.filter((r) => r.alfabetizado).length;
    const asisten = registrosEducacion.filter((r) => r.asisteEscuela).length;

    const nivelesAgrupados = new Map<number, number>();
    for (const registro of registrosEducacion) {
      nivelesAgrupados.set(
        registro.nivelEducativoCatalogoItemId,
        (nivelesAgrupados.get(registro.nivelEducativoCatalogoItemId) ?? 0) + 1,
      );
    }
    const filasDistribucion = Array.from(nivelesAgrupados.entries()).map(([nivelEducativoCatalogoItemId, total]) => ({
      nivelEducativoCatalogoItemId,
      total,
    }));

    return {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      poblacionConDato,
      tasaAlfabetismo: poblacionConDato > 0 ? Math.round((alfabetizados / poblacionConDato) * 1000) / 10 : null,
      tasaAsistenciaEscolar: poblacionConDato > 0 ? Math.round((asisten / poblacionConDato) * 1000) / 10 : null,
      distribucionNivelEducativo: aplicarAnonimizacionKAnonimity(filasDistribucion).map((fila) => ({
        nivelEducativoCatalogoItemId: fila['nivelEducativoCatalogoItemId'] as number,
        total: fila.total,
        suprimido: fila.suprimido,
      })),
    };
  }
}
