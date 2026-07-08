import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { RegistrarCondicionVulnerabilidadDto } from './registrar-condicion-vulnerabilidad.dto';

export class ReemplazarCondicionesVulnerabilidadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarCondicionVulnerabilidadDto)
  condiciones!: RegistrarCondicionVulnerabilidadDto[];
}
