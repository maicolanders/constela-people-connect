import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { RegistrarLenguaHabitanteDto } from './registrar-lengua-habitante.dto';

export class CrearHabitanteEducacionDto {
  @IsBoolean()
  alfabetizado!: boolean;

  @IsInt()
  nivelEducativoCatalogoItemId!: number;

  @IsBoolean()
  asisteEscuela!: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarLenguaHabitanteDto)
  lenguas?: RegistrarLenguaHabitanteDto[];
}
