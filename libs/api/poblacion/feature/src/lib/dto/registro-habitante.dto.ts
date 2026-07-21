import { IsDateString, IsInt, IsString, MinLength } from 'class-validator';

export class RegistroHabitanteDto {
  @IsInt()
  tipoDocumentoId!: number;

  @IsString()
  numeroDocumento!: string;

  @IsDateString()
  fechaNacimiento!: string;

  @IsString()
  @MinLength(8)
  passwordNueva!: string;
}
