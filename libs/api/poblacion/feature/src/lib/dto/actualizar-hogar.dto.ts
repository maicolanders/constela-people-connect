import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoHogar } from '@censo/shared-data-access';

/**
 * Cubre tanto la edición normal como "dar de baja" (RF-01-02 aplicado a
 * hogares por el patrón de versionado de Fase 0): dar de baja es una
 * transición de `estado`/`motivoBaja`, no un endpoint ni un tipo de
 * operación de sync distintos.
 */
export class ActualizarHogarDto {
  @IsOptional()
  @IsString()
  direccionReferencia?: string;

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;

  @IsOptional()
  @IsDateString()
  consentimientoFecha?: string;

  @IsOptional()
  @IsEnum(EstadoHogar)
  estado?: EstadoHogar;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  motivoBaja?: string;

  @IsOptional()
  @IsInt()
  periodoBajaId?: number;
}
