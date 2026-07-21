import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
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

  /** RF-02-01: si viene junto con `edadAproximada`, el servicio recalcula `fechaNacimiento` sintética. */
  @IsOptional()
  @IsBoolean()
  edadEstimada?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  edadAproximada?: number;

  @IsOptional()
  @IsEnum(SexoHabitante)
  sexo?: SexoHabitante;

  @IsOptional()
  @IsInt()
  identidadGeneroCatalogoItemId?: number;

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;

  @IsOptional()
  @IsDateString()
  consentimientoFecha?: string;

  @IsOptional()
  @IsInt()
  parentescoCatalogoItemId?: number;

  /** Reasignación a otro hogar (misma comunidad): requiere `parentescoCatalogoItemId` en el mismo payload. */
  @IsOptional()
  @IsInt()
  hogarId?: number;

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
