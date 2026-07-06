import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UbicacionGeografica } from '@censo/api-georreferenciacion-data-access';
import { IsNull, Repository } from 'typeorm';
import { ActualizarUbicacionGeograficaDto } from '../dto/actualizar-ubicacion-geografica.dto';
import { CrearUbicacionGeograficaDto } from '../dto/crear-ubicacion-geografica.dto';

/** Árbol administrable de lugares reales (RF-03-01, RT-02). */
@Injectable()
export class UbicacionGeograficaService {
  constructor(
    @InjectRepository(UbicacionGeografica) private readonly repositorio: Repository<UbicacionGeografica>,
  ) {}

  /** Sin filtros: raíces del árbol (país). Con `padreId`: hijos directos de ese nodo. */
  listar(padreId?: number): Promise<UbicacionGeografica[]> {
    return this.repositorio.find({
      where: { padreId: padreId === undefined ? IsNull() : padreId },
      order: { nombre: 'ASC' },
    });
  }

  async obtener(id: number): Promise<UbicacionGeografica> {
    const ubicacion = await this.repositorio.findOne({ where: { id } });
    if (!ubicacion) {
      throw new NotFoundException(`Ubicación geográfica ${id} no encontrada`);
    }
    return ubicacion;
  }

  async crear(dto: CrearUbicacionGeograficaDto): Promise<UbicacionGeografica> {
    if (dto.padreId !== undefined) {
      await this.obtener(dto.padreId);
    }
    return this.repositorio.save(
      this.repositorio.create({
        nivelGeograficoCatalogoItemId: dto.nivelGeograficoCatalogoItemId,
        padreId: dto.padreId ?? null,
        nombre: dto.nombre,
        codigo: dto.codigo ?? null,
        activo: dto.activo ?? true,
      }),
    );
  }

  async actualizar(id: number, dto: ActualizarUbicacionGeograficaDto): Promise<UbicacionGeografica> {
    const ubicacion = await this.obtener(id);
    if (dto.padreId !== undefined) {
      await this.obtener(dto.padreId);
    }
    Object.assign(ubicacion, dto);
    return this.repositorio.save(ubicacion);
  }

  async eliminar(id: number): Promise<void> {
    const ubicacion = await this.obtener(id);
    await this.repositorio.softRemove(ubicacion);
  }
}
