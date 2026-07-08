import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class FlujosMigratoriosQueryDto {
  @Type(() => Number)
  @IsInt()
  comunidadId!: number;

  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  motivoCatalogoItemId?: number;

  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
