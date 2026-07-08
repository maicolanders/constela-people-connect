import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

/** RF-09-01: siempre devuelve una fila por comunidad (para comparar/ordenar) — no se filtra por una sola comunidad. */
export class IndicadoresRecursosQueryDto {
  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
