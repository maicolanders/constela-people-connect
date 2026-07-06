import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearUbicacionGeograficaDto {
  @IsInt()
  nivelGeograficoCatalogoItemId!: number;

  @IsOptional()
  @IsInt()
  padreId?: number;

  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
