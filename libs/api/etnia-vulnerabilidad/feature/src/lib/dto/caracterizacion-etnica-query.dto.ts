import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

/**
 * RF-08-03: reporte "a nivel comunidad ... y consolidado nacional".
 * `comunidadId` es opcional a propósito — si se omite, `HabitanteService.listar`
 * ya devuelve todas las comunidades a las que el usuario tiene acceso (o todas
 * las existentes si su asignación es global), lo que da el consolidado
 * nacional sin necesidad de un concepto de "región" propio (no implementado,
 * ver nota en progreso_construccion.md).
 */
export class CaracterizacionEtnicaQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  comunidadId?: number;

  @Type(() => Number)
  @IsInt()
  periodoCensalId!: number;

  @IsOptional()
  @IsIn(['csv'])
  formato?: 'csv';
}
