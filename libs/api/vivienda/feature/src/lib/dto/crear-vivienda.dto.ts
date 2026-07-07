import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsPositive, ValidateNested } from 'class-validator';
import { RegistrarServicioViviendaDto } from './registrar-servicio-vivienda.dto';

export class CrearViviendaDto {
  @IsInt()
  tipoViviendaCatalogoItemId!: number;

  @IsInt()
  materialParedCatalogoItemId!: number;

  @IsInt()
  materialPisoCatalogoItemId!: number;

  @IsInt()
  materialTechoCatalogoItemId!: number;

  @IsOptional()
  @IsPositive()
  numeroHabitaciones?: number;

  @IsPositive()
  numeroDormitorios!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarServicioViviendaDto)
  servicios?: RegistrarServicioViviendaDto[];
}
