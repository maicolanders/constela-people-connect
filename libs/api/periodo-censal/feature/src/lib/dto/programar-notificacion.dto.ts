import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { RolCodigo } from '@censo/shared-data-access';

/** RF-10-03: programa un recordatorio; el destinatario es un rol, una comunidad, un usuario puntual, o cualquier combinación. */
export class ProgramarNotificacionDto {
  @IsOptional()
  @IsInt()
  comunidadId?: number;

  @IsOptional()
  @IsIn(Object.values(RolCodigo))
  rolDestino?: RolCodigo;

  @IsOptional()
  @IsInt()
  usuarioDestinoId?: number;

  @IsString()
  @MaxLength(50)
  tipo!: string;

  @IsString()
  @MaxLength(500)
  mensaje!: string;

  @IsDateString()
  fechaProgramada!: string;
}
