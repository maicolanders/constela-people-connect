import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CrearHabitanteOcupacionDto {
  @IsInt()
  condicionActividadCatalogoItemId!: number;

  @IsOptional()
  @IsInt()
  ocupacionCatalogoItemId?: number;

  @IsOptional()
  @IsPositive()
  ingresoMensual?: number;
}
