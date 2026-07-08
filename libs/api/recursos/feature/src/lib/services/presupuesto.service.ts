import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Presupuesto } from '@censo/api-recursos-data-access';
import { Repository } from 'typeorm';
import { ActualizarPresupuestoDto } from '../dto/actualizar-presupuesto.dto';
import { CrearPresupuestoDto } from '../dto/crear-presupuesto.dto';

/**
 * RF-09-02: un presupuesto por comunidad+periodo (restricción única, mismo
 * criterio de "crear siempre rechaza si ya existe" que `HabitanteEducacion`,
 * Fase 5). A diferencia de todos los dominios anteriores, esto NO es una
 * pantalla de captura de campo (no hay `PresupuestoSyncHandler`/outbox
 * offline): la registra analista/administrador desde una oficina, no un
 * censista sin conexión — ver `RolesGuard` en el controller.
 */
@Injectable()
export class PresupuestoService {
  constructor(
    @InjectRepository(Presupuesto)
    private readonly presupuestoRepository: Repository<Presupuesto>,
  ) {}

  async crear(dto: CrearPresupuestoDto): Promise<Presupuesto> {
    const existente = await this.presupuestoRepository.findOne({
      where: {
        comunidadId: dto.comunidadId,
        periodoCensalId: dto.periodoCensalId,
      },
    });
    if (existente) {
      throw new ForbiddenException(
        'Ya existe un presupuesto para esta comunidad y periodo; use actualizar en su lugar',
      );
    }

    return this.presupuestoRepository.save(
      this.presupuestoRepository.create({
        comunidadId: dto.comunidadId,
        periodoCensalId: dto.periodoCensalId,
        monto: dto.monto.toFixed(2),
        observaciones: dto.observaciones ?? null,
      }),
    );
  }

  async obtener(id: number): Promise<Presupuesto> {
    const presupuesto = await this.presupuestoRepository.findOne({
      where: { id },
    });
    if (!presupuesto) {
      throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    }
    return presupuesto;
  }

  listarPorPeriodo(periodoCensalId: number): Promise<Presupuesto[]> {
    return this.presupuestoRepository.find({ where: { periodoCensalId } });
  }

  async actualizar(
    id: number,
    dto: ActualizarPresupuestoDto,
  ): Promise<Presupuesto> {
    const presupuesto = await this.obtener(id);
    if (dto.monto !== undefined) {
      presupuesto.monto = dto.monto.toFixed(2);
    }
    if (dto.observaciones !== undefined) {
      presupuesto.observaciones = dto.observaciones;
    }
    return this.presupuestoRepository.save(presupuesto);
  }
}
