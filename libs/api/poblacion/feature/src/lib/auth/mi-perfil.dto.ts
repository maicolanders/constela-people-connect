/**
 * Objeto plano de respuesta (nunca la entidad `Habitante` tal cual): si se
 * devolviera la entidad cruda, `SensitiveFieldsInterceptor` redactaría los
 * campos `@CampoSensible` porque `request.user` (actor de habitante) no tiene
 * `roles` — el propio habitante vería su propio documento como `undefined`.
 * Un objeto sin metadata de clase no pasa por esa redacción.
 */
export interface MiPerfilDto {
  habitanteId: number;
  nombres: string;
  apellidos: string;
  sexo: string;
  fechaNacimiento: string;
  numeroDocumento: string | null;
  tipoDocumentoId: number | null;
  hogarId: number;
  comunidadId: number;
  telefono: string | null;
  correoElectronico: string | null;
  direccionReferencia: string | null;
}
