import { Transform } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional } from 'class-validator';

/** RF-10-02: acepta `periodoCensalIds=1,2,3` (query string) — se compara dos o más periodos. */
export class ComparacionHistoricaQueryDto {
  @Transform(({ value }) =>
    String(value)
      .split(',')
      .map((valor) => parseInt(valor.trim(), 10))
      .filter((valor) => !Number.isNaN(valor)),
  )
  @IsInt({ each: true })
  @ArrayMinSize(2)
  periodoCensalIds!: number[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  comunidadId?: number;
}
