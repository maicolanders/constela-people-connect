import { IsDateString, IsEnum, IsInt, IsLatitude, IsLongitude, IsOptional, IsPositive } from 'class-validator';
import { ClasificacionUbicacion } from '@censo/shared-data-access';

export class RegistrarUbicacionHogarDto {
  @IsInt()
  ubicacionGeograficaId!: number;

  @IsLatitude()
  latitud!: number;

  @IsLongitude()
  longitud!: number;

  @IsOptional()
  @IsPositive()
  precisionMetros?: number;

  @IsDateString()
  capturadoEn!: string;

  @IsEnum(ClasificacionUbicacion)
  clasificacion!: ClasificacionUbicacion;

  @IsOptional()
  @IsInt()
  tipoTerritorioCatalogoItemId?: number;
}
