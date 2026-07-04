import { IsDateString, IsString, MaxLength } from 'class-validator';

export class CrearPeriodoCensalDto {
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsDateString()
  fechaInicio!: string;
}
