import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class DemografiaQueryDto {
  @Type(() => Number)
  @IsInt()
  comunidadId!: number;

  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  /** Si se omite, responde JSON; 'csv' devuelve el mismo contenido como texto CSV descargable. */
  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
