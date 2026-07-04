import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EstadoHabitante, SexoHabitante } from '@censo/shared-data-access';

/**
 * Cubre edición normal y "dar de baja" (RF-01-02): dar de baja es una
 * transición de `estado`/`motivoBaja`/`fechaBaja`/`periodoBajaId`, no un
 * endpoint ni un tipo de operación de sync distintos.
 */
export class ActualizarHabitanteDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombres?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  apellidos?: string;

  @IsOptional()
  @IsInt()
  tipoDocumentoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroDocumento?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsEnum(SexoHabitante)
  sexo?: SexoHabitante;

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;

  @IsOptional()
  @IsDateString()
  consentimientoFecha?: string;

  @IsOptional()
  @IsInt()
  parentescoCatalogoItemId?: number;

  @IsOptional()
  @IsEnum(EstadoHabitante)
  estado?: EstadoHabitante;

  @IsOptional()
  @IsString()
  motivoBaja?: string;

  @IsOptional()
  @IsDateString()
  fechaBaja?: string;

  @IsOptional()
  @IsInt()
  periodoBajaId?: number;
}
