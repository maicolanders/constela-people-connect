import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MovimientoMigratorio } from '@censo/api-migracion-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { Repository } from 'typeorm';
import { ActualizarMovimientoMigratorioDto } from '../dto/actualizar-movimiento-migratorio.dto';
import { CrearMovimientoMigratorioDto } from '../dto/crear-movimiento-migratorio.dto';

/**
 * A diferencia de `EducacionService`/`EconomiaService` (1:1, rechazan
 * duplicado), un habitante puede tener múltiples eventos migratorios
 * (RF-07-01): `crearParaHabitante` siempre agrega una fila nueva.
 */
@Injectable()
export class MigracionService {
  constructor(
    @InjectRepository(MovimientoMigratorio) private readonly movimientoRepository: Repository<MovimientoMigratorio>,
    private readonly habitanteService: HabitanteService,
  ) {}

  async crearParaHabitante(
    habitanteId: number,
    dto: CrearMovimientoMigratorioDto,
    usuario: UsuarioAutenticado,
  ): Promise<MovimientoMigratorio> {
    await this.habitanteService.obtener(habitanteId, usuario);

    return this.movimientoRepository.save(
      this.movimientoRepository.create({
        habitanteId,
        periodoCensalId: dto.periodoCensalId,
        tipoMovimiento: dto.tipoMovimiento,
        direccion: dto.direccion,
        origenUbicacionGeograficaId: dto.origenUbicacionGeograficaId ?? null,
        origenDescripcionLibre: dto.origenDescripcionLibre ?? null,
        destinoUbicacionGeograficaId: dto.destinoUbicacionGeograficaId ?? null,
        destinoDescripcionLibre: dto.destinoDescripcionLibre ?? null,
        fechaMovimiento: dto.fechaMovimiento,
        motivoCatalogoItemId: dto.motivoCatalogoItemId,
        esTemporal: dto.esTemporal,
      }),
    );
  }

  async listarPorHabitante(habitanteId: number, usuario: UsuarioAutenticado): Promise<MovimientoMigratorio[]> {
    await this.habitanteService.obtener(habitanteId, usuario);
    return this.movimientoRepository.find({ where: { habitanteId }, order: { fechaMovimiento: 'DESC' } });
  }

  async obtener(id: number): Promise<MovimientoMigratorio> {
    const movimiento = await this.movimientoRepository.findOne({ where: { id } });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento migratorio ${id} no encontrado`);
    }
    return movimiento;
  }

  async actualizar(id: number, dto: ActualizarMovimientoMigratorioDto): Promise<MovimientoMigratorio> {
    const movimiento = await this.obtener(id);
    Object.assign(movimiento, dto);
    return this.movimientoRepository.save(movimiento);
  }

  /** Corrección administrativa real de un registro erróneo (soft delete, no se usa para "deshacer" un evento histórico real). */
  async eliminar(id: number): Promise<void> {
    const movimiento = await this.obtener(id);
    await this.movimientoRepository.softRemove(movimiento);
  }
}
