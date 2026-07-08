import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CrearPresupuestoDto {
  @IsInt()
  comunidadId!: number;

  @IsInt()
  periodoCensalId!: number;

  @IsPositive()
  monto!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;
}
