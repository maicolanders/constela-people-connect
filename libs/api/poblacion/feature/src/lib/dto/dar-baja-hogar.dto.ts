import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class DarBajaHogarDto {
  @IsString()
  @MaxLength(200)
  motivoBaja!: string;

  @IsOptional()
  @IsInt()
  periodoBajaId?: number;
}
