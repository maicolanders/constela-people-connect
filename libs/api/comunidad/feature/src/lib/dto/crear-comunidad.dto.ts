import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearComunidadDto {
  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @MaxLength(30)
  codigo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsBoolean()
  capturaIdentidadGenero?: boolean;
}
