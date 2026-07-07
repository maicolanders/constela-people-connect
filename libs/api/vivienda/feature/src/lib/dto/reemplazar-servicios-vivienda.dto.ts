import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { RegistrarServicioViviendaDto } from './registrar-servicio-vivienda.dto';

export class ReemplazarServiciosViviendaDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegistrarServicioViviendaDto)
  servicios!: RegistrarServicioViviendaDto[];
}
