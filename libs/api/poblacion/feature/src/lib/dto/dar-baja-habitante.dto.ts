import { IsDateString, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { EstadoHabitante } from '@censo/shared-data-access';

export class DarBajaHabitanteDto {
  @IsEnum(EstadoHabitante)
  estado!: EstadoHabitante;

  @IsInt()
  periodoBajaId!: number;

  @IsOptional()
  @IsString()
  motivoBaja?: string;

  @IsOptional()
  @IsDateString()
  fechaBaja?: string;
}
