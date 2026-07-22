import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HogarUbicacion } from '@censo/api-georreferenciacion-data-access';
import { In, Repository } from 'typeorm';
import { RegistrarUbicacionHogarDto } from '../dto/registrar-ubicacion-hogar.dto';
import { UbicacionGeograficaService } from './ubicacion-geografica.service';

/**
 * Sin controller HTTP propio: `domain:georreferenciacion` no puede leer
 * `Hogar`/`Comunidad`, así que no puede verificar por sí solo que un
 * `hogarId` exista y a qué comunidad pertenece. `libs/api/poblacion/feature`
 * (que sí puede depender de este dominio) es quien expone el endpoint,
 * pasando siempre el `comunidadId` ya verificado del hogar real.
 */
@Injectable()
export class HogarUbicacionService {
  constructor(
    @InjectRepository(HogarUbicacion) private readonly repositorio: Repository<HogarUbicacion>,
    private readonly ubicacionGeograficaService: UbicacionGeograficaService,
  ) {}

  async upsert(hogarId: number, comunidadId: number, dto: RegistrarUbicacionHogarDto): Promise<HogarUbicacion> {
    await this.ubicacionGeograficaService.obtener(dto.ubicacionGeograficaId);

    const existente = await this.repositorio.findOne({ where: { hogarId } });
    if (existente && existente.comunidadId !== comunidadId) {
      throw new BadRequestException('El hogar no pertenece a la comunidad indicada');
    }

    const entidad = existente ?? this.repositorio.create({ hogarId, comunidadId });
    entidad.ubicacionGeograficaId = dto.ubicacionGeograficaId;
    entidad.coordenadas = { type: 'Point', coordinates: [dto.longitud, dto.latitud] };
    entidad.precisionMetros = dto.precisionMetros != null ? String(dto.precisionMetros) : null;
    entidad.capturadoEn = new Date(dto.capturadoEn);
    entidad.clasificacion = dto.clasificacion;
    entidad.tipoTerritorioCatalogoItemId = dto.tipoTerritorioCatalogoItemId ?? null;

    return this.repositorio.save(entidad);
  }

  obtenerPorHogar(hogarId: number): Promise<HogarUbicacion | null> {
    return this.repositorio.findOne({ where: { hogarId } });
  }

  listarPorHogares(hogarIds: number[]): Promise<HogarUbicacion[]> {
    if (hogarIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.repositorio.find({ where: { hogarId: In(hogarIds) } });
  }

  listarPorComunidad(comunidadId: number): Promise<HogarUbicacion[]> {
    return this.repositorio.find({ where: { comunidadId } });
  }
}
