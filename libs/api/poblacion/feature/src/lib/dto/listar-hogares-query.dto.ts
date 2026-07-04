import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export class ListarHogaresQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoCensalId?: number;
}
