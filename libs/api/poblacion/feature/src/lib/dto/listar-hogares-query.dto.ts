import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EstadoHogar } from '@censo/shared-data-access';

export class ListarHogaresQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodoCensalId?: number;

  @IsOptional()
  @IsEnum(EstadoHogar)
  estado?: EstadoHogar;

  /** Filtra por dirección de referencia o nombre/apellido del jefe de hogar (buscador de hogares destino). */
  @IsOptional()
  @IsString()
  @MaxLength(150)
  busqueda?: string;

  /**
   * Lote acotado de ids exactos (ej. `?ids=1,2,3`), usado para resolver
   * `hogarId -> uuid` de una sola página de resultados ya paginada de
   * habitantes, sin traer todos los hogares de la comunidad.
   */
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map(Number)
      : String(value)
          .split(',')
          .map((id) => Number(id.trim()))
          .filter((id) => !Number.isNaN(id)),
  )
  ids?: number[];
}
