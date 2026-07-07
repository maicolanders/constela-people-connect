import { PartialType } from '@nestjs/swagger';
import { CrearHabitanteOcupacionDto } from './crear-habitante-ocupacion.dto';

export class ActualizarHabitanteOcupacionDto extends PartialType(CrearHabitanteOcupacionDto) {}
