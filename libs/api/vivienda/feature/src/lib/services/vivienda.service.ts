import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Vivienda, VivendaServicio } from '@censo/api-vivienda-data-access';
import { HogarService } from '@censo/api-poblacion-feature';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DataSource, Repository } from 'typeorm';
import { ActualizarViviendaDto } from '../dto/actualizar-vivienda.dto';
import { CrearViviendaDto } from '../dto/crear-vivienda.dto';
import { RegistrarServicioViviendaDto } from '../dto/registrar-servicio-vivienda.dto';

@Injectable()
export class ViviendaService {
  constructor(
    @InjectRepository(Vivienda) private readonly viviendaRepository: Repository<Vivienda>,
    @InjectRepository(VivendaServicio) private readonly servicioRepository: Repository<VivendaServicio>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly hogarService: HogarService,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  /**
   * Verifica que el hogar exista y pertenezca a la comunidad del usuario
   * (`HogarService.obtener` ya lo hace), crea la vivienda + sus servicios en
   * una sola transacción, y asigna `hogares.vivienda_id` (RF-04-01/02).
   */
  async crearParaHogar(hogarId: number, dto: CrearViviendaDto, usuario: UsuarioAutenticado): Promise<Vivienda> {
    const hogar = await this.hogarService.obtener(hogarId, usuario);
    if (hogar.viviendaId !== null) {
      throw new ForbiddenException('El hogar ya tiene una vivienda registrada; use actualizar en su lugar');
    }
    await this.periodoCensalService.assertAbierto(hogar.periodoCensalId);

    const vivienda = await this.dataSource.transaction(async (manager) => {
      const viviendaCreada = await manager.save(
        manager.create(Vivienda, {
          comunidadId: hogar.comunidadId,
          tipoViviendaCatalogoItemId: dto.tipoViviendaCatalogoItemId,
          materialParedCatalogoItemId: dto.materialParedCatalogoItemId,
          materialPisoCatalogoItemId: dto.materialPisoCatalogoItemId,
          materialTechoCatalogoItemId: dto.materialTechoCatalogoItemId,
          numeroHabitaciones: dto.numeroHabitaciones ?? null,
          numeroDormitorios: dto.numeroDormitorios,
        }),
      );

      for (const servicio of dto.servicios ?? []) {
        await manager.save(
          manager.create(VivendaServicio, {
            viviendaId: viviendaCreada.id,
            tipoServicioCatalogoItemId: servicio.tipoServicioCatalogoItemId,
            estado: servicio.estado,
            fuenteCatalogoItemId: servicio.fuenteCatalogoItemId ?? null,
          }),
        );
      }

      return viviendaCreada;
    });

    // Fuera de la transacción: HogarService usa su propio repositorio (otra
    // conexión), y el hogar necesita ver la vivienda ya comprometida (COMMIT)
    // para que la FK hogares.vivienda_id no falle por aislamiento de transacción.
    await this.hogarService.asignarVivienda(hogar.id, vivienda.id);
    return vivienda;
  }

  async obtenerPorHogar(hogarId: number, usuario: UsuarioAutenticado): Promise<Vivienda> {
    const hogar = await this.hogarService.obtener(hogarId, usuario);
    if (hogar.viviendaId === null) {
      throw new NotFoundException(`El hogar ${hogarId} no tiene vivienda registrada`);
    }
    return this.obtener(hogar.viviendaId);
  }

  async obtener(id: number): Promise<Vivienda> {
    const vivienda = await this.viviendaRepository.findOne({ where: { id } });
    if (!vivienda) {
      throw new NotFoundException(`Vivienda ${id} no encontrada`);
    }
    return vivienda;
  }

  async actualizar(id: number, dto: ActualizarViviendaDto): Promise<Vivienda> {
    const vivienda = await this.obtener(id);
    Object.assign(vivienda, dto);
    return this.viviendaRepository.save(vivienda);
  }

  obtenerServicios(viviendaId: number): Promise<VivendaServicio[]> {
    return this.servicioRepository.find({ where: { viviendaId } });
  }

  /** Reemplazo completo (borra e inserta) — RF-04-02, un servicio por tipo. */
  async reemplazarServicios(viviendaId: number, servicios: RegistrarServicioViviendaDto[]): Promise<VivendaServicio[]> {
    await this.obtener(viviendaId);
    return this.dataSource.transaction(async (manager) => {
      await manager.delete(VivendaServicio, { viviendaId });
      const guardados: VivendaServicio[] = [];
      for (const servicio of servicios) {
        guardados.push(
          await manager.save(
            manager.create(VivendaServicio, {
              viviendaId,
              tipoServicioCatalogoItemId: servicio.tipoServicioCatalogoItemId,
              estado: servicio.estado,
              fuenteCatalogoItemId: servicio.fuenteCatalogoItemId ?? null,
            }),
          ),
        );
      }
      return guardados;
    });
  }
}
