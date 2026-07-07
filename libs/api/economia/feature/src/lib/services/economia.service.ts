import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HabitanteOcupacion } from '@censo/api-economia-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Repository } from 'typeorm';
import { ActualizarHabitanteOcupacionDto } from '../dto/actualizar-habitante-ocupacion.dto';
import { CrearHabitanteOcupacionDto } from '../dto/crear-habitante-ocupacion.dto';

/**
 * Sin necesidad de transacción multi-tabla (a diferencia de `EducacionService`
 * con sus lenguas o `ViviendaService` con sus servicios): la ocupación de un
 * habitante es una sola fila.
 */
@Injectable()
export class EconomiaService {
  constructor(
    @InjectRepository(HabitanteOcupacion) private readonly ocupacionRepository: Repository<HabitanteOcupacion>,
    private readonly habitanteService: HabitanteService,
  ) {}

  async crearParaHabitante(
    habitanteId: number,
    dto: CrearHabitanteOcupacionDto,
    usuario: UsuarioAutenticado,
  ): Promise<HabitanteOcupacion> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const existente = await this.ocupacionRepository.findOne({ where: { habitanteId } });
    if (existente) {
      throw new ForbiddenException('El habitante ya tiene un registro de ocupación; use actualizar en su lugar');
    }

    return this.ocupacionRepository.save(
      this.ocupacionRepository.create({
        habitanteId,
        condicionActividadCatalogoItemId: dto.condicionActividadCatalogoItemId,
        ocupacionCatalogoItemId: dto.ocupacionCatalogoItemId ?? null,
        ingresoMensual: dto.ingresoMensual !== undefined ? String(dto.ingresoMensual) : null,
      }),
    );
  }

  async obtenerPorHabitante(habitanteId: number, usuario: UsuarioAutenticado): Promise<HabitanteOcupacion> {
    await this.habitanteService.obtener(habitanteId, usuario);
    const ocupacion = await this.ocupacionRepository.findOne({ where: { habitanteId } });
    if (!ocupacion) {
      throw new NotFoundException(`El habitante ${habitanteId} no tiene registro de ocupación`);
    }
    return ocupacion;
  }

  async obtener(id: number): Promise<HabitanteOcupacion> {
    const ocupacion = await this.ocupacionRepository.findOne({ where: { id } });
    if (!ocupacion) {
      throw new NotFoundException(`Registro de ocupación ${id} no encontrado`);
    }
    return ocupacion;
  }

  async actualizar(id: number, dto: ActualizarHabitanteOcupacionDto): Promise<HabitanteOcupacion> {
    const ocupacion = await this.obtener(id);
    Object.assign(ocupacion, {
      ...dto,
      ingresoMensual: dto.ingresoMensual !== undefined ? String(dto.ingresoMensual) : ocupacion.ingresoMensual,
    });
    return this.ocupacionRepository.save(ocupacion);
  }
}
