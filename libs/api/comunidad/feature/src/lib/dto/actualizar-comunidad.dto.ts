import { PartialType } from '@nestjs/swagger';
import { CrearComunidadDto } from './crear-comunidad.dto';

export class ActualizarComunidadDto extends PartialType(CrearComunidadDto) {}
