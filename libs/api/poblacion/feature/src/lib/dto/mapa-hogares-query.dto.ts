import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class MapaHogaresQueryDto {
  @Type(() => Number)
  @IsInt()
  comunidadId!: number;

  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
