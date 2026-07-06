import { PartialType } from '@nestjs/swagger';
import { CrearUbicacionGeograficaDto } from './crear-ubicacion-geografica.dto';

export class ActualizarUbicacionGeograficaDto extends PartialType(CrearUbicacionGeograficaDto) {}
