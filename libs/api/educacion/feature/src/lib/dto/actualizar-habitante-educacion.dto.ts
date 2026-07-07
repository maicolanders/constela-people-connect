import { OmitType, PartialType } from '@nestjs/swagger';
import { CrearHabitanteEducacionDto } from './crear-habitante-educacion.dto';

export class ActualizarHabitanteEducacionDto extends PartialType(OmitType(CrearHabitanteEducacionDto, ['lenguas'] as const)) {}
