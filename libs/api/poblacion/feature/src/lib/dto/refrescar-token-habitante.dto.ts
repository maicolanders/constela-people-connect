import { IsString } from 'class-validator';

export class RefrescarTokenHabitanteDto {
  @IsString()
  refreshToken!: string;
}
