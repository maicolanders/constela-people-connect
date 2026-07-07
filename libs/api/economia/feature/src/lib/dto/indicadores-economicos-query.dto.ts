import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { SexoHabitante } from '@censo/shared-data-access';

export class IndicadoresEconomicosQueryDto {
  @Type(() => Number)
  @IsInt()
  comunidadId!: number;

  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @IsIn(Object.values(SexoHabitante))
  sexo?: SexoHabitante;

  @IsOptional()
  grupoQuinquenal?: string;

  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
