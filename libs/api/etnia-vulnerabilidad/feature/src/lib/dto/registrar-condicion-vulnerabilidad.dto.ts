import { IsInt } from 'class-validator';

export class RegistrarCondicionVulnerabilidadDto {
  @IsInt()
  condicionVulnerabilidadCatalogoItemId!: number;
}
