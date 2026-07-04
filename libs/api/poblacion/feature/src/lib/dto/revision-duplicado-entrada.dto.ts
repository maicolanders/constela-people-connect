import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/**
 * Confirmación del censista de que un candidato similar (RF-01-05) no es el
 * mismo habitante. Se referencia por `uuid` (no por `id` numérico): el
 * candidato pudo haberse comparado contra otro habitante creado en el mismo
 * dispositivo y todavía sin sincronizar, que aún no tiene id de servidor.
 */
export class RevisionDuplicadoEntradaDto {
  @IsUUID()
  habitanteSimilarUuid!: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  scoreSimilitud!: number;

  @IsOptional()
  @IsString()
  justificacion?: string;
}
