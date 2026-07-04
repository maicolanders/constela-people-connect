import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearHogarDto {
  @IsUUID()
  uuid!: string;

  @IsInt()
  comunidadId!: number;

  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @IsString()
  direccionReferencia?: string;

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;

  @IsOptional()
  @IsDateString()
  consentimientoFecha?: string;
}
