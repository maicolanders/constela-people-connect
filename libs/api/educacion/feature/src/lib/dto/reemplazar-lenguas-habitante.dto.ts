import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { RegistrarLenguaHabitanteDto } from './registrar-lengua-habitante.dto';

export class ReemplazarLenguasHabitanteDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarLenguaHabitanteDto)
  lenguas!: RegistrarLenguaHabitanteDto[];
}
