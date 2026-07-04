import { IsInt } from 'class-validator';

export class ActualizarJefeHogarDto {
  @IsInt()
  jefeHogarId!: number;
}
