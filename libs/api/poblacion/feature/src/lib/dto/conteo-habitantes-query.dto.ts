import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ConteoHabitantesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoCensalId?: number;
}
