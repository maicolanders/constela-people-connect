import { PartialType } from '@nestjs/swagger';
import { CrearCatalogoItemDto } from './crear-catalogo-item.dto';

export class ActualizarCatalogoItemDto extends PartialType(CrearCatalogoItemDto) {}
