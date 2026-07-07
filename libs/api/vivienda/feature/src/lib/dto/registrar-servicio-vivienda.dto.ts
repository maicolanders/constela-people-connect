import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoServicio } from '@censo/shared-data-access';

export class RegistrarServicioViviendaDto {
  @IsInt()
  tipoServicioCatalogoItemId!: number;

  @IsEnum(EstadoServicio)
  estado!: EstadoServicio;

  @IsOptional()
  @IsInt()
  fuenteCatalogoItemId?: number;
}
