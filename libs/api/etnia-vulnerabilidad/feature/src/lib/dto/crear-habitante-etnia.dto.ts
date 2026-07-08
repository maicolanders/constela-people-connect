import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { RegistrarCondicionVulnerabilidadDto } from './registrar-condicion-vulnerabilidad.dto';

export class CrearHabitanteEtniaDto {
  @IsInt()
  etniaCatalogoItemId!: number;

  @IsOptional()
  @IsInt()
  lenguaMaternaCatalogoItemId?: number;

  @IsOptional()
  @IsInt()
  resguardoUbicacionGeograficaId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarCondicionVulnerabilidadDto)
  condicionesVulnerabilidad?: RegistrarCondicionVulnerabilidadDto[];
}
