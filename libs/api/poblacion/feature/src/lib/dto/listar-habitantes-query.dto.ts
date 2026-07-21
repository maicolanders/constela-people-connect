import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { EstadoHabitante } from '@censo/shared-data-access';

export class ListarHabitantesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  hogarId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoCensalId?: number;

  @IsOptional()
  @IsEnum(EstadoHabitante)
  estado?: EstadoHabitante;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  tipoDocumentoId?: number;

  /** Búsqueda por prefijo (RNF-05/buscador de habitante): ver índice `habitantes_comunidad_documento_idx`. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  numeroDocumento?: string;

  /**
   * Paginación opcional: si no se envían, `listar` se comporta exactamente
   * igual que antes (sin límite) — así ningún consumidor existente del
   * endpoint (pull de duplicados, buscador de hogares, panel de
   * administración) cambia de comportamiento por esta extensión.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
