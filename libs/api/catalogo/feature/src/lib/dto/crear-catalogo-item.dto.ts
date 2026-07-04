import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearCatalogoItemDto {
  @IsString()
  @MaxLength(60)
  codigo!: string;

  @IsString()
  @MaxLength(150)
  nombre!: string;

  @IsOptional()
  @IsInt()
  padreId?: number;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
