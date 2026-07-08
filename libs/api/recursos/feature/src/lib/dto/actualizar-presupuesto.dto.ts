import { OmitType, PartialType } from '@nestjs/swagger';
import { CrearPresupuestoDto } from './crear-presupuesto.dto';

/** `comunidadId`/`periodoCensalId` definen el registro (restricción única); no se editan, se corrige monto/observaciones. */
export class ActualizarPresupuestoDto extends PartialType(OmitType(CrearPresupuestoDto, ['comunidadId', 'periodoCensalId'] as const)) {}
