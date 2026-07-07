import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class RegistrarLenguaHabitanteDto {
  @IsInt()
  lenguaCatalogoItemId!: number;

  @IsOptional()
  @IsBoolean()
  esLenguaMaterna?: boolean;
}
