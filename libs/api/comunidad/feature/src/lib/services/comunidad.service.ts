import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Comunidad } from '@censo/api-comunidad-data-access';
import { Repository } from 'typeorm';
import { ActualizarComunidadDto } from '../dto/actualizar-comunidad.dto';
import { CrearComunidadDto } from '../dto/crear-comunidad.dto';

@Injectable()
export class ComunidadService {
  constructor(@InjectRepository(Comunidad) private readonly comunidadRepository: Repository<Comunidad>) {}

  listar(): Promise<Comunidad[]> {
    return this.comunidadRepository.find({ order: { nombre: 'ASC' } });
  }

  async obtener(id: number): Promise<Comunidad> {
    const comunidad = await this.comunidadRepository.findOne({ where: { id } });
    if (!comunidad) {
      throw new NotFoundException(`Comunidad ${id} no encontrada`);
    }
    return comunidad;
  }

  crear(dto: CrearComunidadDto): Promise<Comunidad> {
    return this.comunidadRepository.save(this.comunidadRepository.create(dto));
  }

  async actualizar(id: number, dto: ActualizarComunidadDto): Promise<Comunidad> {
    const comunidad = await this.obtener(id);
    Object.assign(comunidad, dto);
    return this.comunidadRepository.save(comunidad);
  }

  async eliminar(id: number): Promise<void> {
    const comunidad = await this.obtener(id);
    await this.comunidadRepository.softRemove(comunidad);
  }
}
