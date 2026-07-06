import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { HogarUbicacionService } from '@censo/api-georreferenciacion-feature';
import { tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { ClasificacionUbicacion, EstadoHabitante, EstadoHogar, RolCodigo } from '@censo/shared-data-access';
import { aplicarAnonimizacionKAnonimity } from '@censo/shared-util';
import { Habitante } from '@censo/api-poblacion-data-access';
import { In, Repository } from 'typeorm';
import { HogarService } from './hogar.service';

export interface PuntoMapaHogar {
  hogarId: number;
  ubicacionGeograficaId: number;
  coordenadas: { type: 'Point'; coordinates: [number, number] };
  clasificacion: ClasificacionUbicacion;
  tipoTerritorioCatalogoItemId: number | null;
  poblacionHogar: number;
}

export interface NodoMapaAgregado {
  ubicacionGeograficaId: number;
  totalHogares: number | null;
  totalHabitantes: number | null;
  suprimido: boolean;
}

const ROLES_MAPA_INDIVIDUAL = [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO, RolCodigo.ADMINISTRADOR];

/**
 * RF-03-03: mapa con datos individuales para roles con acceso a habitantes de
 * su comunidad; agregado (con supresión k-anonimity, sin coordenadas exactas)
 * para analista. Vive en `poblacion` porque necesita `Hogar`/`Habitante`
 * (densidad poblacional) junto con `HogarUbicacion` (georreferenciacion), y
 * `georreferenciacion` no puede depender de `poblacion` (ver eslint.config.mjs).
 */
@Injectable()
export class MapaHogaresService {
  constructor(
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
    private readonly hogarService: HogarService,
    private readonly hogarUbicacionService: HogarUbicacionService,
  ) {}

  async obtener(
    usuario: UsuarioAutenticado,
    comunidadId: number,
    periodoCensalId: number,
  ): Promise<PuntoMapaHogar[] | NodoMapaAgregado[]> {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }

    const hogares = (await this.hogarService.listar(usuario, { comunidadId, periodoCensalId })).filter(
      (hogar) => hogar.estado === EstadoHogar.ACTIVO,
    );
    const hogarIds = hogares.map((hogar) => hogar.id);
    const ubicaciones = await this.hogarUbicacionService.listarPorHogares(hogarIds);
    const poblacionPorHogar = await this.contarHabitantesPorHogar(hogarIds);

    const esRolIndividual = usuario.roles.some((rol) => ROLES_MAPA_INDIVIDUAL.includes(rol));
    if (esRolIndividual) {
      return ubicaciones.map((ubicacion) => ({
        hogarId: ubicacion.hogarId,
        ubicacionGeograficaId: ubicacion.ubicacionGeograficaId,
        coordenadas: ubicacion.coordenadas,
        clasificacion: ubicacion.clasificacion,
        tipoTerritorioCatalogoItemId: ubicacion.tipoTerritorioCatalogoItemId,
        poblacionHogar: poblacionPorHogar.get(ubicacion.hogarId) ?? 0,
      }));
    }

    return this.agregarPorNodoGeografico(ubicaciones, poblacionPorHogar);
  }

  private agregarPorNodoGeografico(
    ubicaciones: Array<{ hogarId: number; ubicacionGeograficaId: number }>,
    poblacionPorHogar: Map<number, number>,
  ): NodoMapaAgregado[] {
    const acumulado = new Map<number, { totalHogares: number; totalHabitantes: number }>();
    for (const ubicacion of ubicaciones) {
      const actual = acumulado.get(ubicacion.ubicacionGeograficaId) ?? { totalHogares: 0, totalHabitantes: 0 };
      actual.totalHogares += 1;
      actual.totalHabitantes += poblacionPorHogar.get(ubicacion.hogarId) ?? 0;
      acumulado.set(ubicacion.ubicacionGeograficaId, actual);
    }

    const filas = Array.from(acumulado.entries()).map(([ubicacionGeograficaId, valores]) => ({
      ubicacionGeograficaId,
      total: valores.totalHogares,
      totalHabitantes: valores.totalHabitantes,
    }));

    return aplicarAnonimizacionKAnonimity(filas).map((fila) => ({
      ubicacionGeograficaId: fila['ubicacionGeograficaId'] as number,
      totalHogares: fila.total,
      totalHabitantes: fila.suprimido ? null : (fila['totalHabitantes'] as number),
      suprimido: fila.suprimido,
    }));
  }

  private async contarHabitantesPorHogar(hogarIds: number[]): Promise<Map<number, number>> {
    if (hogarIds.length === 0) {
      return new Map();
    }
    const habitantes = await this.habitanteRepository.find({
      where: { hogarId: In(hogarIds), estado: EstadoHabitante.ACTIVO },
    });
    const conteo = new Map<number, number>();
    for (const habitante of habitantes) {
      conteo.set(habitante.hogarId, (conteo.get(habitante.hogarId) ?? 0) + 1);
    }
    return conteo;
  }
}
