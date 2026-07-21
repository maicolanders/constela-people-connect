import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Fase 14 (autogestión): campos que el propio habitante puede editar sobre sí mismo/su hogar. */
export class ActualizarContactoPropioDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correoElectronico?: string;

  @IsOptional()
  @IsString()
  direccionReferencia?: string;
}
