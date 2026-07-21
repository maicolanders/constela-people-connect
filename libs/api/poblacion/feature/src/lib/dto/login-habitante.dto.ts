import { IsInt, IsString, MinLength } from 'class-validator';

export class LoginHabitanteDto {
  @IsInt()
  tipoDocumentoId!: number;

  @IsString()
  numeroDocumento!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
