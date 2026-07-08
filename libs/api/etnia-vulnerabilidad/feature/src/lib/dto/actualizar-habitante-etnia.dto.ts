import { OmitType, PartialType } from '@nestjs/swagger';
import { CrearHabitanteEtniaDto } from './crear-habitante-etnia.dto';

export class ActualizarHabitanteEtniaDto extends PartialType(OmitType(CrearHabitanteEtniaDto, ['condicionesVulnerabilidad'] as const)) {}
