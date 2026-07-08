import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MovimientoMigratorio } from '@censo/api-migracion-data-access';
import { HabitanteService } from '@censo/api-poblacion-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DireccionMigratoria } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity } from '@censo/shared-util';
import { In, Repository } from 'typeorm';
import { FlujosMigratoriosQueryDto } from '../dto/flujos-migratorios-query.dto';

export interface FlujoOrigenDestinoDto {
  origen: string;
  destino: string;
  total: number | null;
  suprimido: boolean;
}

export interface FlujosMigratoriosDto {
  comunidadId: number;
  periodoCensalId: number;
  totalEntradas: number | null;
  totalSalidas: number | null;
  saldoNeto: number | null;
  flujos: FlujoOrigenDestinoDto[];
}

const SIN_DATO = 'Sin dato';

/**
 * RF-07-02: en vivo (mismo criterio que cobertura de servicios/indicadores
 * educativos/económicos de Fases 4-6) — no hay condición de "solo periodos
 * cerrados". El "mapa con flechas origen-destino" del RF se implementa como
 * tabla agrupada por origen→destino: `UbicacionGeografica` (Fase 3) no tiene
 * coordenadas, no hay forma de dibujar flechas reales sin ampliar esa
 * entidad, algo que ningún RF de esta fase pide explícitamente.
 */
@Injectable()
export class FlujosMigratoriosService {
  constructor(
    @InjectRepository(MovimientoMigratorio) private readonly movimientoRepository: Repository<MovimientoMigratorio>,
    private readonly habitanteService: HabitanteService,
  ) {}

  async obtener(usuario: UsuarioAutenticado, dto: FlujosMigratoriosQueryDto): Promise<FlujosMigratoriosDto> {
    if (!tieneAccesoComunidad(usuario.asignaciones, dto.comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }

    const habitantes = await this.habitanteService.listar(usuario, { comunidadId: dto.comunidadId });
    const habitanteIds = habitantes.map((habitante) => habitante.id);

    const movimientos =
      habitanteIds.length > 0
        ? await this.movimientoRepository.find({
            where: {
              habitanteId: In(habitanteIds),
              periodoCensalId: dto.periodoCensalId,
              ...(dto.motivoCatalogoItemId ? { motivoCatalogoItemId: dto.motivoCatalogoItemId } : {}),
            },
            relations: { origenUbicacionGeografica: true, destinoUbicacionGeografica: true },
          })
        : [];

    const entradas = movimientos.filter((m) => m.direccion === DireccionMigratoria.ENTRADA);
    const salidas = movimientos.filter((m) => m.direccion === DireccionMigratoria.SALIDA);

    const [entradasAnonimizada, salidasAnonimizada] = aplicarAnonimizacionKAnonimity([
      { total: entradas.length },
      { total: salidas.length },
    ]);
    const suprimidoAgregado = entradasAnonimizada.suprimido || salidasAnonimizada.suprimido;

    const flujosAgrupados = new Map<string, { origen: string; destino: string; total: number }>();
    for (const movimiento of movimientos) {
      const origen = movimiento.origenUbicacionGeografica?.nombre ?? movimiento.origenDescripcionLibre ?? SIN_DATO;
      const destino = movimiento.destinoUbicacionGeografica?.nombre ?? movimiento.destinoDescripcionLibre ?? SIN_DATO;
      const clave = `${origen}→${destino}`;
      const actual = flujosAgrupados.get(clave) ?? { origen, destino, total: 0 };
      actual.total += 1;
      flujosAgrupados.set(clave, actual);
    }

    return {
      comunidadId: dto.comunidadId,
      periodoCensalId: dto.periodoCensalId,
      totalEntradas: entradasAnonimizada.total,
      totalSalidas: salidasAnonimizada.total,
      saldoNeto: suprimidoAgregado ? null : entradas.length - salidas.length,
      flujos: aplicarAnonimizacionKAnonimity(Array.from(flujosAgrupados.values())).map((fila) => ({
        origen: fila['origen'] as string,
        destino: fila['destino'] as string,
        total: fila.total,
        suprimido: fila.suprimido,
      })),
    };
  }
}
