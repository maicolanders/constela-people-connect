import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SexoHabitante } from '@censo/shared-data-access';
import { RevisionDuplicadoEntradaDto } from './revision-duplicado-entrada.dto';

export class CrearHabitanteDto {
  @IsUUID()
  uuid!: string;

  @IsInt()
  hogarId!: number;

  @IsInt()
  periodoCensalId!: number;

  @IsString()
  @MaxLength(150)
  nombres!: string;

  @IsString()
  @MaxLength(150)
  apellidos!: string;

  @IsOptional()
  @IsInt()
  tipoDocumentoId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroDocumento?: string;

  /** RF-02-01: si `edadEstimada` es true, se exige `edadAproximada` en su lugar (ver HabitanteService). */
  @IsOptional()
  @IsBoolean()
  edadEstimada?: boolean;

  @ValidateIf((dto: CrearHabitanteDto) => !dto.edadEstimada)
  @IsDateString()
  fechaNacimiento?: string;

  @ValidateIf((dto: CrearHabitanteDto) => dto.edadEstimada === true)
  @IsInt()
  @Min(0)
  @Max(120)
  edadAproximada?: number;

  @IsEnum(SexoHabitante)
  sexo!: SexoHabitante;

  /** Catálogo `identidad_genero`, solo si la comunidad del hogar lo tiene activado (Comunidad.capturaIdentidadGenero). */
  @IsOptional()
  @IsInt()
  identidadGeneroCatalogoItemId?: number;

  @IsOptional()
  @IsBoolean()
  consentimientoInformado?: boolean;

  @IsOptional()
  @IsDateString()
  consentimientoFecha?: string;

  /** Catálogo `parentesco`: relación con el jefe de hogar (RF-01-03). */
  @IsInt()
  parentescoCatalogoItemId!: number;

  /** Confirmaciones de "no es duplicado" (RF-01-05) capturadas junto con el alta, para que viajen en el mismo payload offline. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RevisionDuplicadoEntradaDto)
  revisionesDuplicado?: RevisionDuplicadoEntradaDto[];
}
