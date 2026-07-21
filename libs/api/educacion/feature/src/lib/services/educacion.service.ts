import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { HabitanteEducacion, HabitanteLengua } from '@censo/api-educacion-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DataSource, Repository } from 'typeorm';
import { ActualizarHabitanteEducacionDto } from '../dto/actualizar-habitante-educacion.dto';
import { CrearHabitanteEducacionDto } from '../dto/crear-habitante-educacion.dto';
import { RegistrarLenguaHabitanteDto } from '../dto/registrar-lengua-habitante.dto';

/**
 * A diferencia de `ViviendaService` (Fase 4), aquí no hay un puntero hacia
 * atrás que actualizar en otra entidad (no existe `habitantes.educacion_id`):
 * toda la escritura cabe dentro de una sola transacción, sin el riesgo de
 * aislamiento que obligó a mover `asignarVivienda` fuera de su transacción.
 */
@Injectable()
export class EducacionService {
  constructor(
    @InjectRepository(HabitanteEducacion) private readonly educacionRepository: Repository<HabitanteEducacion>,
    @InjectRepository(HabitanteLengua) private readonly lenguaRepository: Repository<HabitanteLengua>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly habitanteService: HabitanteService,
  ) {}

  /**
   * `usuario` es opcional: cuando no se pasa (rutas de autogestión del propio
   * habitante, Fase 14), `HabitanteService.obtener` omite la verificación de
   * comunidad — seguro porque `habitanteId` en ese caso viene resuelto del
   * JWT del propio habitante, nunca de un parámetro de cliente.
   */
  async crearParaHabitante(
    habitanteId: number,
    dto: CrearHabitanteEducacionDto,
    usuario?: UsuarioAutenticado,
  ): Promise<HabitanteEducacion> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const existente = await this.educacionRepository.findOne({ where: { habitanteId } });
    if (existente) {
      throw new ForbiddenException('El habitante ya tiene un registro de educación; use actualizar en su lugar');
    }

    return this.dataSource.transaction(async (manager) => {
      const educacion = await manager.save(
        manager.create(HabitanteEducacion, {
          habitanteId,
          alfabetizado: dto.alfabetizado,
          nivelEducativoCatalogoItemId: dto.nivelEducativoCatalogoItemId,
          asisteEscuela: dto.asisteEscuela,
        }),
      );

      for (const lengua of dto.lenguas ?? []) {
        await manager.save(
          manager.create(HabitanteLengua, {
            habitanteId,
            lenguaCatalogoItemId: lengua.lenguaCatalogoItemId,
            esLenguaMaterna: lengua.esLenguaMaterna ?? false,
          }),
        );
      }

      return educacion;
    });
  }

  async obtenerPorHabitante(habitanteId: number, usuario?: UsuarioAutenticado): Promise<HabitanteEducacion> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const educacion = await this.educacionRepository.findOne({ where: { habitanteId } });
    if (!educacion) {
      throw new NotFoundException(`El habitante ${habitanteId} no tiene registro de educación`);
    }
    return educacion;
  }

  async obtener(id: number): Promise<HabitanteEducacion> {
    const educacion = await this.educacionRepository.findOne({ where: { id } });
    if (!educacion) {
      throw new NotFoundException(`Registro de educación ${id} no encontrado`);
    }
    return educacion;
  }

  async actualizar(id: number, dto: ActualizarHabitanteEducacionDto): Promise<HabitanteEducacion> {
    const educacion = await this.obtener(id);
    Object.assign(educacion, dto);
    return this.educacionRepository.save(educacion);
  }

  obtenerLenguas(habitanteId: number): Promise<HabitanteLengua[]> {
    return this.lenguaRepository.find({ where: { habitanteId } });
  }

  /** Reemplazo completo (borra e inserta) — mismo patrón que ViviendaService.reemplazarServicios. */
  async reemplazarLenguas(habitanteId: number, lenguas: RegistrarLenguaHabitanteDto[]): Promise<HabitanteLengua[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(HabitanteLengua, { habitanteId });
      const guardadas: HabitanteLengua[] = [];
      for (const lengua of lenguas) {
        guardadas.push(
          await manager.save(
            manager.create(HabitanteLengua, {
              habitanteId,
              lenguaCatalogoItemId: lengua.lenguaCatalogoItemId,
              esLenguaMaterna: lengua.esLenguaMaterna ?? false,
            }),
          ),
        );
      }
      return guardadas;
    });
  }
}
