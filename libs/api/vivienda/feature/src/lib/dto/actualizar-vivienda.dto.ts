import { OmitType, PartialType } from '@nestjs/swagger';
import { CrearViviendaDto } from './crear-vivienda.dto';

export class ActualizarViviendaDto extends PartialType(OmitType(CrearViviendaDto, ['servicios'] as const)) {}
