import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoHabitante } from '@censo/shared-data-access';

export class ListarHabitantesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hogarId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoCensalId?: number;

  @IsOptional()
  @IsEnum(EstadoHabitante)
  estado?: EstadoHabitante;
}
