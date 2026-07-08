import { PartialType } from '@nestjs/swagger';
import { CrearMovimientoMigratorioDto } from './crear-movimiento-migratorio.dto';

export class ActualizarMovimientoMigratorioDto extends PartialType(CrearMovimientoMigratorioDto) {}
