import { IsDateString, IsInt, IsString } from 'class-validator';

export class VerificarDuplicadosDto {
  @IsInt()
  comunidadId!: number;

  @IsString()
  nombres!: string;

  @IsString()
  apellidos!: string;

  @IsDateString()
  fechaNacimiento!: string;
}
