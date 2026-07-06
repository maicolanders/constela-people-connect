import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Habitante } from '@censo/api-poblacion-data-access';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHabitante, EstadoPeriodo } from '@censo/shared-data-access';
import {
  aplicarAnonimizacionKAnonimity,
  calcularEdad,
  calcularGrupoQuinquenal,
  FilaReporteAgregado,
} from '@censo/shared-util';
import { Repository } from 'typeorm';
import { DemografiaQueryDto } from '../dto/demografia-query.dto';

export interface BucketPiramide {
  grupoQuinquenal: string;
  sexo: string;
  total: number | null;
  suprimido: boolean;
}

/** Los 17 grupos quinquenales (0-4 ... 80+), derivados de la misma función que agrupa cada habitante (nunca duplicados a mano). */
const GRUPOS_QUINQUENALES = Array.from({ length: 17 }, (_, indice) => calcularGrupoQuinquenal(indice * 5));

@Injectable()
export class PiramidePoblacionalService {
  constructor(
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  /**
   * RF-02-02: "dinámicamente a partir de datos vigentes" — a diferencia de
   * los indicadores (RF-02-03), funciona para cualquier periodo. La edad se
   * calcula contra `fechaCierre` si el periodo ya cerró (congelado) o contra
   * hoy si sigue abierto (vivo).
   */
  async obtener(usuario: UsuarioAutenticado, dto: DemografiaQueryDto): Promise<BucketPiramide[]> {
    this.verificarAcceso(dto.comunidadId, usuario);

    const periodo = await this.periodoCensalService.obtener(dto.periodoCensalId);
    const fechaReferencia =
      periodo.estado === EstadoPeriodo.CERRADO && periodo.fechaCierre ? new Date(periodo.fechaCierre) : new Date();

    const habitantes = await this.habitanteRepository.find({
      where: { comunidadId: dto.comunidadId, periodoCensalId: dto.periodoCensalId, estado: EstadoHabitante.ACTIVO },
    });

    const conteos = new Map<string, number>();
    for (const habitante of habitantes) {
      const edad = calcularEdad(new Date(habitante.fechaNacimiento), fechaReferencia);
      const grupo = calcularGrupoQuinquenal(edad);
      const clave = `${grupo}|${habitante.sexo}`;
      conteos.set(clave, (conteos.get(clave) ?? 0) + 1);
    }

    const sexos = [...new Set(habitantes.map((h) => h.sexo))].sort();
    const filas: FilaReporteAgregado[] = GRUPOS_QUINQUENALES.flatMap((grupoQuinquenal) =>
      sexos.map((sexo) => ({ grupoQuinquenal, sexo, total: conteos.get(`${grupoQuinquenal}|${sexo}`) ?? 0 })),
    );

    return aplicarAnonimizacionKAnonimity(filas) as unknown as BucketPiramide[];
  }

  private verificarAcceso(comunidadId: number, usuario: UsuarioAutenticado): void {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }
  }
}
