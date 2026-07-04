import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CatalogoItem, CatalogoTipo } from '@censo/api-catalogo-data-access';
import { Repository } from 'typeorm';
import { ActualizarCatalogoItemDto } from '../dto/actualizar-catalogo-item.dto';
import { CrearCatalogoItemDto } from '../dto/crear-catalogo-item.dto';

@Injectable()
export class CatalogoService {
  constructor(
    @InjectRepository(CatalogoTipo) private readonly catalogoTipoRepository: Repository<CatalogoTipo>,
    @InjectRepository(CatalogoItem) private readonly catalogoItemRepository: Repository<CatalogoItem>,
  ) {}

  listarTipos(): Promise<CatalogoTipo[]> {
    return this.catalogoTipoRepository.find({ order: { nombre: 'ASC' } });
  }

  async listarItemsPorTipo(tipoCodigo: string, soloActivos = true): Promise<CatalogoItem[]> {
    const tipo = await this.obtenerTipoPorCodigo(tipoCodigo);
    return this.catalogoItemRepository.find({
      where: soloActivos ? { catalogoTipoId: tipo.id, activo: true } : { catalogoTipoId: tipo.id },
      order: { orden: 'ASC', nombre: 'ASC' },
    });
  }

  async crearItem(tipoCodigo: string, dto: CrearCatalogoItemDto): Promise<CatalogoItem> {
    const tipo = await this.obtenerTipoPorCodigo(tipoCodigo);
    return this.catalogoItemRepository.save(
      this.catalogoItemRepository.create({ ...dto, catalogoTipoId: tipo.id, padreId: dto.padreId ?? null }),
    );
  }

  async actualizarItem(id: number, dto: ActualizarCatalogoItemDto): Promise<CatalogoItem> {
    const item = await this.obtenerItem(id);
    Object.assign(item, dto);
    return this.catalogoItemRepository.save(item);
  }

  async eliminarItem(id: number): Promise<void> {
    const item = await this.obtenerItem(id);
    await this.catalogoItemRepository.softRemove(item);
  }

  private async obtenerTipoPorCodigo(codigo: string): Promise<CatalogoTipo> {
    const tipo = await this.catalogoTipoRepository.findOne({ where: { codigo } });
    if (!tipo) {
      throw new NotFoundException(`Catálogo "${codigo}" no encontrado`);
    }
    return tipo;
  }

  private async obtenerItem(id: number): Promise<CatalogoItem> {
    const item = await this.catalogoItemRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Ítem de catálogo ${id} no encontrado`);
    }
    return item;
  }
}
