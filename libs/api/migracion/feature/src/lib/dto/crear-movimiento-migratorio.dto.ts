import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { DireccionMigratoria, TipoMovimientoMigratorio } from '@censo/shared-data-access';

export class CrearMovimientoMigratorioDto {
  @IsInt()
  periodoCensalId!: number;

  @IsEnum(TipoMovimientoMigratorio)
  tipoMovimiento!: TipoMovimientoMigratorio;

  @IsEnum(DireccionMigratoria)
  direccion!: DireccionMigratoria;

  @IsOptional()
  @IsInt()
  origenUbicacionGeograficaId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  origenDescripcionLibre?: string;

  @IsOptional()
  @IsInt()
  destinoUbicacionGeograficaId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  destinoDescripcionLibre?: string;

  @IsDateString()
  fechaMovimiento!: string;

  @IsInt()
  motivoCatalogoItemId!: number;

  @IsBoolean()
  esTemporal!: boolean;
}
