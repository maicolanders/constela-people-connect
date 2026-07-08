import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  HabitanteCondicionVulnerabilidad,
  HabitanteEtnia,
} from '@censo/api-etnia-vulnerabilidad-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DataSource, Repository } from 'typeorm';
import { ActualizarHabitanteEtniaDto } from '../dto/actualizar-habitante-etnia.dto';
import { CrearHabitanteEtniaDto } from '../dto/crear-habitante-etnia.dto';
import { RegistrarCondicionVulnerabilidadDto } from '../dto/registrar-condicion-vulnerabilidad.dto';

/**
 * Mismo patrón que `EducacionService` (Fase 5): `HabitanteEtnia` es 1:1 con
 * el habitante y `HabitanteCondicionVulnerabilidad` es su sub-colección N,
 * administrada por reemplazo completo (no por eventos que se acumulan como
 * `MovimientoMigratorio` en Fase 7).
 */
@Injectable()
export class EtniaVulnerabilidadService {
  constructor(
    @InjectRepository(HabitanteEtnia)
    private readonly etniaRepository: Repository<HabitanteEtnia>,
    @InjectRepository(HabitanteCondicionVulnerabilidad)
    private readonly condicionRepository: Repository<HabitanteCondicionVulnerabilidad>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly habitanteService: HabitanteService,
  ) {}

  async crearParaHabitante(
    habitanteId: number,
    dto: CrearHabitanteEtniaDto,
    usuario: UsuarioAutenticado,
  ): Promise<HabitanteEtnia> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const existente = await this.etniaRepository.findOne({
      where: { habitanteId },
    });
    if (existente) {
      throw new ForbiddenException(
        'El habitante ya tiene un registro de identificación étnica; use actualizar en su lugar',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const etnia = await manager.save(
        manager.create(HabitanteEtnia, {
          habitanteId,
          etniaCatalogoItemId: dto.etniaCatalogoItemId,
          lenguaMaternaCatalogoItemId: dto.lenguaMaternaCatalogoItemId ?? null,
          resguardoUbicacionGeograficaId:
            dto.resguardoUbicacionGeograficaId ?? null,
        }),
      );

      for (const codigoUnico of new Set(
        (dto.condicionesVulnerabilidad ?? []).map(
          (c) => c.condicionVulnerabilidadCatalogoItemId,
        ),
      )) {
        await manager.save(
          manager.create(HabitanteCondicionVulnerabilidad, {
            habitanteId,
            condicionVulnerabilidadCatalogoItemId: codigoUnico,
          }),
        );
      }

      return etnia;
    });
  }

  async obtenerPorHabitante(
    habitanteId: number,
    usuario: UsuarioAutenticado,
  ): Promise<HabitanteEtnia> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const etnia = await this.etniaRepository.findOne({
      where: { habitanteId },
    });
    if (!etnia) {
      throw new NotFoundException(
        `El habitante ${habitanteId} no tiene registro de identificación étnica`,
      );
    }
    return etnia;
  }

  async obtener(id: number): Promise<HabitanteEtnia> {
    const etnia = await this.etniaRepository.findOne({ where: { id } });
    if (!etnia) {
      throw new NotFoundException(
        `Registro de identificación étnica ${id} no encontrado`,
      );
    }
    return etnia;
  }

  async actualizar(
    id: number,
    dto: ActualizarHabitanteEtniaDto,
  ): Promise<HabitanteEtnia> {
    const etnia = await this.obtener(id);
    Object.assign(etnia, dto);
    return this.etniaRepository.save(etnia);
  }

  obtenerCondiciones(
    habitanteId: number,
  ): Promise<HabitanteCondicionVulnerabilidad[]> {
    return this.condicionRepository.find({ where: { habitanteId } });
  }

  /** Reemplazo completo (borra e inserta) — mismo patrón que EducacionService.reemplazarLenguas. */
  async reemplazarCondiciones(
    habitanteId: number,
    condiciones: RegistrarCondicionVulnerabilidadDto[],
  ): Promise<HabitanteCondicionVulnerabilidad[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(HabitanteCondicionVulnerabilidad, { habitanteId });
      const guardadas: HabitanteCondicionVulnerabilidad[] = [];
      for (const codigoUnico of new Set(
        condiciones.map((c) => c.condicionVulnerabilidadCatalogoItemId),
      )) {
        guardadas.push(
          await manager.save(
            manager.create(HabitanteCondicionVulnerabilidad, {
              habitanteId,
              condicionVulnerabilidadCatalogoItemId: codigoUnico,
            }),
          ),
        );
      }
      return guardadas;
    });
  }
}
