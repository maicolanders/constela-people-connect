import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Hogar } from '@censo/api-poblacion-data-access';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { comunidadesPermitidas, tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoHogar } from '@censo/shared-data-access';
import { In, Repository } from 'typeorm';
import { ActualizarHogarDto } from '../dto/actualizar-hogar.dto';
import { CrearHogarDto } from '../dto/crear-hogar.dto';
import { DarBajaHogarDto } from '../dto/dar-baja-hogar.dto';
import { ListarHogaresQueryDto } from '../dto/listar-hogares-query.dto';

@Injectable()
export class HogarService {
  constructor(
    @InjectRepository(Hogar) private readonly hogarRepository: Repository<Hogar>,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  async listar(usuario: UsuarioAutenticado, filtros: ListarHogaresQueryDto = {}): Promise<Hogar[]> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);

    if (filtros.comunidadId !== undefined) {
      if (permitido !== 'global' && !permitido.includes(filtros.comunidadId)) {
        throw new ForbiddenException('No tiene acceso a esta comunidad');
      }
      return this.hogarRepository.find({
        where: { comunidadId: filtros.comunidadId, ...(filtros.periodoCensalId ? { periodoCensalId: filtros.periodoCensalId } : {}) },
        order: { id: 'ASC' },
      });
    }

    if (permitido === 'global') {
      return this.hogarRepository.find({
        where: filtros.periodoCensalId ? { periodoCensalId: filtros.periodoCensalId } : {},
        order: { id: 'ASC' },
      });
    }

    if (permitido.length === 0) {
      return [];
    }

    return this.hogarRepository.find({
      where: { comunidadId: In(permitido), ...(filtros.periodoCensalId ? { periodoCensalId: filtros.periodoCensalId } : {}) },
      order: { id: 'ASC' },
    });
  }

  async obtener(id: number, usuario?: UsuarioAutenticado): Promise<Hogar> {
    const hogar = await this.hogarRepository.findOne({ where: { id } });
    if (!hogar) {
      throw new NotFoundException(`Hogar ${id} no encontrado`);
    }
    if (usuario) {
      this.verificarAcceso(hogar.comunidadId, usuario);
    }
    return hogar;
  }

  obtenerPorUuid(uuid: string): Promise<Hogar | null> {
    return this.hogarRepository.findOne({ where: { uuid } });
  }

  async crear(dto: CrearHogarDto, usuario: UsuarioAutenticado): Promise<Hogar> {
    const existente = await this.obtenerPorUuid(dto.uuid);
    if (existente) {
      return existente;
    }

    this.verificarAcceso(dto.comunidadId, usuario);
    await this.periodoCensalService.assertAbierto(dto.periodoCensalId);

    return this.hogarRepository.save(
      this.hogarRepository.create({
        uuid: dto.uuid,
        comunidadId: dto.comunidadId,
        periodoCensalId: dto.periodoCensalId,
        direccionReferencia: dto.direccionReferencia ?? null,
        consentimientoInformado: dto.consentimientoInformado ?? false,
        consentimientoFecha: dto.consentimientoFecha ? new Date(dto.consentimientoFecha) : null,
      }),
    );
  }

  async actualizar(id: number, dto: ActualizarHogarDto, usuario: UsuarioAutenticado): Promise<Hogar> {
    const hogar = await this.obtener(id, usuario);
    await this.periodoCensalService.assertAbierto(hogar.periodoCensalId);

    Object.assign(hogar, {
      ...dto,
      consentimientoFecha: dto.consentimientoFecha !== undefined ? new Date(dto.consentimientoFecha) : hogar.consentimientoFecha,
    });
    return this.hogarRepository.save(hogar);
  }

  /** Transición de estado (RF-01-02 aplicado a hogares), no un soft-delete. */
  darBaja(id: number, dto: DarBajaHogarDto, usuario: UsuarioAutenticado): Promise<Hogar> {
    return this.actualizar(
      id,
      { estado: EstadoHogar.INACTIVO, motivoBaja: dto.motivoBaja, periodoBajaId: dto.periodoBajaId },
      usuario,
    );
  }

  /** Invocado por HabitanteService al registrar al jefe de hogar (RF-01-03). */
  async actualizarJefeHogar(hogarId: number, jefeHogarId: number): Promise<void> {
    const hogar = await this.obtener(hogarId);
    hogar.jefeHogarId = jefeHogarId;
    await this.hogarRepository.save(hogar);
  }

  /** Corrección administrativa real de un registro erróneo (no es "dar de baja", ver ActualizarHogarDto). */
  async eliminar(id: number): Promise<void> {
    const hogar = await this.obtener(id);
    await this.hogarRepository.softRemove(hogar);
  }

  private verificarAcceso(comunidadId: number, usuario: UsuarioAutenticado): void {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }
  }
}
