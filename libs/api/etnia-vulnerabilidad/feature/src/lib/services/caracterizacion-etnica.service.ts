import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { aplicarAnonimizacionKAnonimity } from '@censo/shared-util';
import { In, Repository } from 'typeorm';
import { CaracterizacionEtnicaQueryDto } from '../dto/caracterizacion-etnica-query.dto';

export interface ConteoCategoriaDto {
  categoria: string;
  total: number | null;
  suprimido: boolean;
}

export interface CaracterizacionEtnicaDto {
  comunidadId: number | null;
  periodoCensalId: number;
  totalHabitantes: number;
  porEtnia: ConteoCategoriaDto[];
  porCondicionVulnerabilidad: ConteoCategoriaDto[];
}

const SIN_DATO = 'Sin dato';

/**
 * RF-08-03: caracterización étnica y de vulnerabilidad, en vivo (sin vista
 * materializada, mismo criterio que Fases 4/6/7). `comunidadId` es opcional
 * en el DTO: si se omite, `HabitanteService.listar` ya agrega todas las
 * comunidades permitidas para el usuario (o todas si su acceso es global),
 * lo que cubre "consolidado nacional" sin necesitar un concepto de "región"
 * propio — ver nota de alcance en progreso_construccion.md.
 */
@Injectable()
export class CaracterizacionEtnicaService {
  constructor(
    @InjectRepository(HabitanteEtnia)
    private readonly etniaRepository: Repository<HabitanteEtnia>,
    @InjectRepository(HabitanteCondicionVulnerabilidad)
    private readonly condicionRepository: Repository<HabitanteCondicionVulnerabilidad>,
    private readonly habitanteService: HabitanteService,
  ) {}

  async obtener(
    usuario: UsuarioAutenticado,
    dto: CaracterizacionEtnicaQueryDto,
  ): Promise<CaracterizacionEtnicaDto> {
    const habitantes = await this.habitanteService.listar(usuario, {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
    });
    const habitanteIds = habitantes.map((h) => h.id);

    const etnias =
      habitanteIds.length > 0
        ? await this.etniaRepository.find({
            where: { habitanteId: In(habitanteIds) },
            relations: { etnia: true },
          })
        : [];
    const condiciones =
      habitanteIds.length > 0
        ? await this.condicionRepository.find({
            where: { habitanteId: In(habitanteIds) },
            relations: { condicionVulnerabilidad: true },
          })
        : [];

    return {
      comunidadId: dto.comunidadId ?? null,
      periodoCensalId: dto.periodoCensalId,
      totalHabitantes: habitanteIds.length,
      porEtnia: this.agruparYAnonimizar(
        etnias.map((e) => e.etnia?.nombre ?? SIN_DATO),
      ),
      porCondicionVulnerabilidad: this.agruparYAnonimizar(
        condiciones.map((c) => c.condicionVulnerabilidad?.nombre ?? SIN_DATO),
      ),
    };
  }

  private agruparYAnonimizar(etiquetas: string[]): ConteoCategoriaDto[] {
    const conteos = new Map<string, number>();
    for (const etiqueta of etiquetas) {
      conteos.set(etiqueta, (conteos.get(etiqueta) ?? 0) + 1);
    }
    const filas = Array.from(conteos.entries()).map(([categoria, total]) => ({
      categoria,
      total,
    }));
    return aplicarAnonimizacionKAnonimity(filas).map((fila) => ({
      categoria: fila['categoria'] as string,
      total: fila.total,
      suprimido: fila.suprimido,
    }));
  }
}
