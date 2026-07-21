import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  Habitante,
  HabitanteParentesco,
  HabitanteRevisionDuplicado,
  Hogar,
} from '@censo/api-poblacion-data-access';
import { CatalogoItem } from '@censo/api-catalogo-data-access';
import { PeriodoCensalService } from '@censo/api-periodo-censal-feature';
import { comunidadesPermitidas, tieneAccesoComunidad } from '@censo/api-auth-feature';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DecisionRevisionDuplicado, EstadoHabitante, EstadoHogar } from '@censo/shared-data-access';
import { calcularSimilitudHabitante, UMBRAL_POSIBLE_DUPLICADO } from '@censo/shared-util';
import { DataSource, FindOptionsWhere, In, IsNull, Like, Repository } from 'typeorm';
import { ActualizarContactoPropioDto } from '../dto/actualizar-contacto-propio.dto';
import { ActualizarHabitanteDto } from '../dto/actualizar-habitante.dto';
import { ConteoHabitantesQueryDto } from '../dto/conteo-habitantes-query.dto';
import { CrearHabitanteDto } from '../dto/crear-habitante.dto';
import { DarBajaHabitanteDto } from '../dto/dar-baja-habitante.dto';
import { ListarHabitantesQueryDto } from '../dto/listar-habitantes-query.dto';
import { VerificarDuplicadosDto } from '../dto/verificar-duplicados.dto';
import { HogarService } from './hogar.service';

export interface CandidatoDuplicado {
  habitante: Habitante;
  score: number;
}

export interface MiembroNucleoFamiliarDto {
  habitanteId: number;
  nombres: string;
  apellidos: string;
  estado: EstadoHabitante;
  esJefeHogar: boolean;
  parentescoCodigo: string | null;
  parentescoNombre: string | null;
}

export interface NucleoFamiliarDto {
  hogarId: number;
  miembros: MiembroNucleoFamiliarDto[];
}

const CODIGO_JEFE_HOGAR = 'jefe_hogar';

@Injectable()
export class HabitanteService {
  constructor(
    @InjectRepository(Habitante) private readonly habitanteRepository: Repository<Habitante>,
    @InjectRepository(HabitanteParentesco) private readonly parentescoRepository: Repository<HabitanteParentesco>,
    @InjectRepository(CatalogoItem) private readonly catalogoItemRepository: Repository<CatalogoItem>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly hogarService: HogarService,
    private readonly periodoCensalService: PeriodoCensalService,
  ) {}

  /**
   * `limit`/`offset` son opcionales (RNF-05): si no se envían, el
   * comportamiento es idéntico al anterior (sin límite) — solo el listado
   * paginado de habitantes-list los envía; el resto de consumidores de este
   * endpoint (pull de duplicados, buscador de hogares, panel de
   * administración) no cambia. `numeroDocumento` filtra por prefijo (ver
   * índice `habitantes_comunidad_documento_idx`).
   */
  async listar(usuario: UsuarioAutenticado, filtros: ListarHabitantesQueryDto = {}): Promise<Habitante[]> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);
    const base: FindOptionsWhere<Habitante> = {
      ...(filtros.hogarId ? { hogarId: filtros.hogarId } : {}),
      ...(filtros.periodoCensalId ? { periodoCensalId: filtros.periodoCensalId } : {}),
      ...(filtros.estado ? { estado: filtros.estado } : {}),
      ...(filtros.tipoDocumentoId ? { tipoDocumentoId: filtros.tipoDocumentoId } : {}),
      ...(filtros.numeroDocumento ? { numeroDocumento: Like(`${filtros.numeroDocumento}%`) } : {}),
    };
    const paginacion = { take: filtros.limit, skip: filtros.offset };

    if (filtros.comunidadId !== undefined) {
      if (permitido !== 'global' && !permitido.includes(filtros.comunidadId)) {
        throw new ForbiddenException('No tiene acceso a esta comunidad');
      }
      return this.habitanteRepository.find({
        where: { ...base, comunidadId: filtros.comunidadId },
        order: { id: 'ASC' },
        ...paginacion,
      });
    }

    if (permitido === 'global') {
      return this.habitanteRepository.find({ where: base, order: { id: 'ASC' }, ...paginacion });
    }
    if (permitido.length === 0) {
      return [];
    }
    return this.habitanteRepository.find({
      where: { ...base, comunidadId: In(permitido) },
      order: { id: 'ASC' },
      ...paginacion,
    });
  }

  async obtener(id: number, usuario?: UsuarioAutenticado): Promise<Habitante> {
    const habitante = await this.habitanteRepository.findOne({ where: { id } });
    if (!habitante) {
      throw new NotFoundException(`Habitante ${id} no encontrado`);
    }
    if (usuario) {
      this.verificarAcceso(habitante.comunidadId, usuario);
    }
    return habitante;
  }

  obtenerPorUuid(uuid: string): Promise<Habitante | null> {
    return this.habitanteRepository.findOne({ where: { uuid } });
  }

  async contarActivos(usuario: UsuarioAutenticado, filtros: ConteoHabitantesQueryDto = {}): Promise<number> {
    const permitido = comunidadesPermitidas(usuario.asignaciones);
    const base: FindOptionsWhere<Habitante> = {
      estado: EstadoHabitante.ACTIVO,
      ...(filtros.periodoCensalId ? { periodoCensalId: filtros.periodoCensalId } : {}),
    };

    if (filtros.comunidadId !== undefined) {
      if (permitido !== 'global' && !permitido.includes(filtros.comunidadId)) {
        throw new ForbiddenException('No tiene acceso a esta comunidad');
      }
      return this.habitanteRepository.count({ where: { ...base, comunidadId: filtros.comunidadId } });
    }

    if (permitido === 'global') {
      return this.habitanteRepository.count({ where: base });
    }
    if (permitido.length === 0) {
      return 0;
    }
    return this.habitanteRepository.count({ where: { ...base, comunidadId: In(permitido) } });
  }

  /**
   * RF-01-05: candidatos activos de la misma comunidad con score >= umbral,
   * usando el mismo cálculo (`@censo/shared-util`) que la caché offline del
   * frontend, para que backend y frontend nunca diverjan en el criterio.
   */
  async verificarDuplicados(usuario: UsuarioAutenticado, dto: VerificarDuplicadosDto): Promise<CandidatoDuplicado[]> {
    this.verificarAcceso(dto.comunidadId, usuario);

    const candidatos = await this.habitanteRepository.find({
      where: { comunidadId: dto.comunidadId, estado: EstadoHabitante.ACTIVO },
    });

    const datosNuevo = {
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      fechaNacimiento: new Date(dto.fechaNacimiento),
      comunidadId: dto.comunidadId,
    };

    return candidatos
      .map((habitante) => ({
        habitante,
        score: calcularSimilitudHabitante(datosNuevo, {
          nombres: habitante.nombres,
          apellidos: habitante.apellidos,
          fechaNacimiento: new Date(habitante.fechaNacimiento),
          comunidadId: habitante.comunidadId,
        }),
      }))
      .filter((candidato) => candidato.score >= UMBRAL_POSIBLE_DUPLICADO)
      .sort((a, b) => b.score - a.score);
  }

  async crear(dto: CrearHabitanteDto, usuario: UsuarioAutenticado): Promise<Habitante> {
    const existente = await this.obtenerPorUuid(dto.uuid);
    if (existente) {
      return existente;
    }

    const hogar = await this.hogarService.obtener(dto.hogarId, usuario);
    await this.periodoCensalService.assertAbierto(dto.periodoCensalId);

    if (dto.numeroDocumento) {
      const duplicadoDocumento = await this.habitanteRepository.findOne({
        where: {
          comunidadId: hogar.comunidadId,
          tipoDocumentoId: dto.tipoDocumentoId ?? IsNull(),
          numeroDocumento: dto.numeroDocumento,
        },
      });
      if (duplicadoDocumento) {
        throw new ConflictException('Ya existe un habitante con ese documento en esta comunidad');
      }
    }

    const parentescoItem = await this.catalogoItemRepository.findOne({ where: { id: dto.parentescoCatalogoItemId } });
    if (!parentescoItem) {
      throw new NotFoundException(`Ítem de parentesco ${dto.parentescoCatalogoItemId} no encontrado`);
    }

    return this.dataSource.transaction(async (manager) => {
      const habitante = await manager.save(
        Habitante,
        manager.create(Habitante, {
          uuid: dto.uuid,
          hogarId: hogar.id,
          comunidadId: hogar.comunidadId,
          periodoCensalId: dto.periodoCensalId,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          tipoDocumentoId: dto.tipoDocumentoId ?? null,
          numeroDocumento: dto.numeroDocumento ?? null,
          identificadorInterno: dto.numeroDocumento ? null : dto.uuid,
          fechaNacimiento: this.resolverFechaNacimiento(dto),
          edadEstimada: dto.edadEstimada ?? false,
          sexo: dto.sexo,
          identidadGeneroCatalogoItemId: dto.identidadGeneroCatalogoItemId ?? null,
          consentimientoInformado: dto.consentimientoInformado ?? false,
          consentimientoFecha: dto.consentimientoFecha ? new Date(dto.consentimientoFecha) : null,
        }),
      );

      await manager.save(
        HabitanteParentesco,
        manager.create(HabitanteParentesco, {
          uuid: randomUUID(),
          habitanteId: habitante.id,
          hogarId: hogar.id,
          catalogoItemId: dto.parentescoCatalogoItemId,
          periodoCensalId: dto.periodoCensalId,
          version: 1,
        }),
      );

      if (parentescoItem.codigo === CODIGO_JEFE_HOGAR) {
        hogar.jefeHogarId = habitante.id;
        await manager.save(Hogar, hogar);
      }

      for (const revision of dto.revisionesDuplicado ?? []) {
        // Resuelve por uuid (no por id): el candidato pudo compararse contra otro
        // habitante creado en el mismo dispositivo y aún sin sincronizar. Si
        // todavía no existe en el servidor, se omite esta traza puntual sin
        // afectar la creación del habitante (best-effort, no crítico).
        const similar = await manager.findOneBy(Habitante, { uuid: revision.habitanteSimilarUuid });
        if (!similar) {
          continue;
        }
        await manager.save(
          HabitanteRevisionDuplicado,
          manager.create(HabitanteRevisionDuplicado, {
            habitanteId: habitante.id,
            habitanteSimilarId: similar.id,
            scoreSimilitud: revision.scoreSimilitud,
            decision: DecisionRevisionDuplicado.CONFIRMADO_NO_DUPLICADO,
            justificacion: revision.justificacion ?? null,
          }),
        );
      }

      return habitante;
    });
  }

  async actualizar(id: number, dto: ActualizarHabitanteDto, usuario: UsuarioAutenticado): Promise<Habitante> {
    const habitante = await this.obtener(id, usuario);
    await this.periodoCensalService.assertAbierto(habitante.periodoCensalId);

    if (dto.hogarId !== undefined && dto.hogarId !== habitante.hogarId) {
      return this.reasignarHogar(habitante, dto, usuario);
    }

    this.aplicarCamposSimples(habitante, dto);

    const guardado = await this.habitanteRepository.save(habitante);

    if (dto.parentescoCatalogoItemId !== undefined) {
      await this.actualizarParentesco(guardado, dto.parentescoCatalogoItemId);
    }

    return guardado;
  }

  /**
   * Fase 14 (autogestión): a diferencia de `actualizar`, no recibe `usuario`
   * (el `habitanteId` ya viene resuelto desde el JWT propio del habitante,
   * nunca de un parámetro de cliente) y deliberadamente NO llama a
   * `periodoCensalService.assertAbierto` — teléfono/correo no son datos
   * "recensables por periodo" como sexo/fechaNacimiento, deben poder
   * actualizarse siempre, incluso con el periodo cerrado.
   */
  async actualizarContactoPropio(habitanteId: number, dto: ActualizarContactoPropioDto): Promise<Habitante> {
    const habitante = await this.obtener(habitanteId);
    if (dto.telefono !== undefined) habitante.telefono = dto.telefono;
    if (dto.correoElectronico !== undefined) habitante.correoElectronico = dto.correoElectronico;
    return this.habitanteRepository.save(habitante);
  }

  /**
   * Reasigna un habitante a otro hogar de la misma comunidad (cambio de
   * núcleo familiar). Autocontenida (no reutiliza `actualizarParentesco`):
   * esa depende de que `hogarId` de la fila de parentesco ya sea el correcto,
   * cosa que aquí es justo lo que cambia. Toda mutación de `Hogar` se hace
   * vía el `manager` transaccional, nunca vía `hogarService`, para no invocar
   * un servicio que usa su propio repositorio inyectado dentro de la
   * transacción (fuente de bugs ya documentada en otras fases del proyecto).
   */
  private async reasignarHogar(
    habitante: Habitante,
    dto: ActualizarHabitanteDto,
    usuario: UsuarioAutenticado,
  ): Promise<Habitante> {
    if (dto.parentescoCatalogoItemId === undefined) {
      throw new BadRequestException('parentescoCatalogoItemId es requerido al reasignar el habitante a otro hogar');
    }

    const hogarDestino = await this.hogarService.obtener(dto.hogarId as number, usuario);
    if (hogarDestino.estado !== EstadoHogar.ACTIVO) {
      throw new ConflictException('El hogar destino no está activo');
    }
    if (hogarDestino.comunidadId !== habitante.comunidadId) {
      throw new BadRequestException('El hogar destino debe pertenecer a la misma comunidad que el habitante');
    }

    const parentescoItem = await this.catalogoItemRepository.findOne({ where: { id: dto.parentescoCatalogoItemId } });
    if (!parentescoItem) {
      throw new NotFoundException(`Ítem de parentesco ${dto.parentescoCatalogoItemId} no encontrado`);
    }

    return this.dataSource.transaction(async (manager) => {
      const hogarOrigen = await manager.findOneOrFail(Hogar, { where: { id: habitante.hogarId } });

      this.aplicarCamposSimples(habitante, dto);
      habitante.hogarId = hogarDestino.id;

      const habitanteGuardado = await manager.save(Habitante, habitante);

      if (hogarOrigen.jefeHogarId === habitanteGuardado.id) {
        hogarOrigen.jefeHogarId = null;
        await manager.save(Hogar, hogarOrigen);
      }

      const existenteParentesco = await manager.findOne(HabitanteParentesco, {
        where: { habitanteId: habitanteGuardado.id, periodoCensalId: habitanteGuardado.periodoCensalId },
      });
      if (existenteParentesco) {
        existenteParentesco.catalogoItemId = dto.parentescoCatalogoItemId as number;
        existenteParentesco.hogarId = hogarDestino.id;
        existenteParentesco.version += 1;
        await manager.save(HabitanteParentesco, existenteParentesco);
      } else {
        await manager.save(
          HabitanteParentesco,
          manager.create(HabitanteParentesco, {
            uuid: randomUUID(),
            habitanteId: habitanteGuardado.id,
            hogarId: hogarDestino.id,
            catalogoItemId: dto.parentescoCatalogoItemId as number,
            periodoCensalId: habitanteGuardado.periodoCensalId,
            version: 1,
          }),
        );
      }

      if (parentescoItem.codigo === CODIGO_JEFE_HOGAR) {
        hogarDestino.jefeHogarId = habitanteGuardado.id;
        await manager.save(Hogar, hogarDestino);
      }

      return habitanteGuardado;
    });
  }

  private aplicarCamposSimples(habitante: Habitante, dto: ActualizarHabitanteDto): void {
    if (dto.nombres !== undefined) habitante.nombres = dto.nombres;
    if (dto.apellidos !== undefined) habitante.apellidos = dto.apellidos;
    if (dto.tipoDocumentoId !== undefined) habitante.tipoDocumentoId = dto.tipoDocumentoId;
    if (dto.numeroDocumento !== undefined) {
      habitante.numeroDocumento = dto.numeroDocumento;
      habitante.identificadorInterno = dto.numeroDocumento ? null : habitante.uuid;
    }
    if (dto.fechaNacimiento !== undefined) {
      habitante.fechaNacimiento = dto.fechaNacimiento;
      habitante.edadEstimada = false;
    } else if (dto.edadEstimada === true || dto.edadAproximada !== undefined) {
      habitante.fechaNacimiento = this.resolverFechaNacimiento({ edadEstimada: true, edadAproximada: dto.edadAproximada });
      habitante.edadEstimada = true;
    } else if (dto.edadEstimada === false) {
      habitante.edadEstimada = false;
    }
    if (dto.sexo !== undefined) habitante.sexo = dto.sexo;
    if (dto.identidadGeneroCatalogoItemId !== undefined) {
      habitante.identidadGeneroCatalogoItemId = dto.identidadGeneroCatalogoItemId;
    }
    if (dto.consentimientoInformado !== undefined) habitante.consentimientoInformado = dto.consentimientoInformado;
    if (dto.consentimientoFecha !== undefined) habitante.consentimientoFecha = new Date(dto.consentimientoFecha);
    if (dto.estado !== undefined) habitante.estado = dto.estado;
    if (dto.motivoBaja !== undefined) habitante.motivoBaja = dto.motivoBaja;
    if (dto.fechaBaja !== undefined) habitante.fechaBaja = dto.fechaBaja;
    if (dto.periodoBajaId !== undefined) habitante.periodoBajaId = dto.periodoBajaId;
  }

  /** Transición de estado (RF-01-02), no un soft-delete: debe seguir apareciendo en reportes históricos. */
  darBaja(id: number, dto: DarBajaHabitanteDto, usuario: UsuarioAutenticado): Promise<Habitante> {
    return this.actualizar(id, dto, usuario);
  }

  /** Corrección administrativa real de un registro erróneo. */
  async eliminar(id: number): Promise<void> {
    const habitante = await this.obtener(id);
    await this.habitanteRepository.softRemove(habitante);
  }

  /**
   * Fase 11 (panel de administración): organigrama del núcleo familiar de un
   * hogar. El único vínculo familiar que el modelo de datos registra es
   * "parentesco con el jefe de hogar" (`HabitanteParentesco`, Fase 0) — no
   * existe un grafo de relaciones habitante-a-habitante más amplio (p.ej.
   * "hermano de", "tío de"), así que el organigrama se resuelve como una
   * estrella de un nivel: jefe de hogar en el centro, cada otro miembro
   * conectado con su parentesco relativo a él. `HabitanteParentesco` está
   * versionado por periodo censal (puede haber más de una fila histórica por
   * habitante); se toma la más reciente por `periodoCensalId`.
   */
  async obtenerNucleoFamiliar(hogarId: number, usuario: UsuarioAutenticado): Promise<NucleoFamiliarDto> {
    const hogar = await this.hogarService.obtener(hogarId, usuario);
    return this.armarNucleoFamiliar(hogar);
  }

  /**
   * Fase 14 (autogestión): variante para el propio habitante — el `hogarId`
   * se resuelve SIEMPRE desde el habitante autenticado (`habitante.hogarId`),
   * nunca se acepta como parámetro de cliente, para que un habitante jamás
   * pueda ver el núcleo familiar de un hogar ajeno.
   */
  async obtenerNucleoFamiliarPropio(habitanteId: number): Promise<NucleoFamiliarDto> {
    const habitante = await this.obtener(habitanteId);
    const hogar = await this.hogarService.obtener(habitante.hogarId);
    return this.armarNucleoFamiliar(hogar);
  }

  private async armarNucleoFamiliar(hogar: Hogar): Promise<NucleoFamiliarDto> {
    const hogarId = hogar.id;
    const habitantes = await this.habitanteRepository.find({ where: { hogarId }, order: { id: 'ASC' } });
    if (habitantes.length === 0) {
      return { hogarId, miembros: [] };
    }

    const parentescos = await this.parentescoRepository.find({
      where: { habitanteId: In(habitantes.map((habitante) => habitante.id)) },
      relations: { catalogoItem: true },
      order: { periodoCensalId: 'DESC' },
    });
    const parentescoPorHabitante = new Map<number, HabitanteParentesco>();
    for (const parentesco of parentescos) {
      if (!parentescoPorHabitante.has(parentesco.habitanteId)) {
        parentescoPorHabitante.set(parentesco.habitanteId, parentesco);
      }
    }

    return {
      hogarId,
      miembros: habitantes.map((habitante) => {
        const parentesco = parentescoPorHabitante.get(habitante.id);
        return {
          habitanteId: habitante.id,
          nombres: habitante.nombres,
          apellidos: habitante.apellidos,
          estado: habitante.estado,
          esJefeHogar: hogar.jefeHogarId === habitante.id,
          parentescoCodigo: parentesco?.catalogoItem?.codigo ?? null,
          parentescoNombre: parentesco?.catalogoItem?.nombre ?? null,
        };
      }),
    };
  }

  private async actualizarParentesco(habitante: Habitante, catalogoItemId: number): Promise<void> {
    const item = await this.catalogoItemRepository.findOne({ where: { id: catalogoItemId } });
    if (!item) {
      throw new NotFoundException(`Ítem de parentesco ${catalogoItemId} no encontrado`);
    }

    const existente = await this.parentescoRepository.findOne({
      where: { habitanteId: habitante.id, periodoCensalId: habitante.periodoCensalId },
    });

    if (existente) {
      existente.catalogoItemId = catalogoItemId;
      existente.version += 1;
      await this.parentescoRepository.save(existente);
    } else {
      await this.parentescoRepository.save(
        this.parentescoRepository.create({
          uuid: randomUUID(),
          habitanteId: habitante.id,
          hogarId: habitante.hogarId,
          catalogoItemId,
          periodoCensalId: habitante.periodoCensalId,
          version: 1,
        }),
      );
    }

    if (item.codigo === CODIGO_JEFE_HOGAR) {
      await this.hogarService.actualizarJefeHogar(habitante.hogarId, habitante.id);
    }
  }

  /**
   * RF-02-01 ("edad estimada"): sintetiza el 1 de enero del año de
   * nacimiento aproximado cuando no hay fecha exacta, para que el resto del
   * sistema (cálculo de edad, pirámide poblacional, indicadores) siga
   * operando sobre una única columna `fechaNacimiento`.
   */
  private resolverFechaNacimiento(dto: {
    edadEstimada?: boolean;
    edadAproximada?: number;
    fechaNacimiento?: string;
  }): string {
    if (dto.edadEstimada) {
      if (dto.edadAproximada === undefined) {
        throw new BadRequestException('edadAproximada es requerida cuando edadEstimada es true');
      }
      const anioNacimiento = new Date().getFullYear() - dto.edadAproximada;
      return `${anioNacimiento}-01-01`;
    }
    if (!dto.fechaNacimiento) {
      throw new BadRequestException('fechaNacimiento es requerida cuando edadEstimada no es true');
    }
    return dto.fechaNacimiento;
  }

  private verificarAcceso(comunidadId: number, usuario: UsuarioAutenticado): void {
    if (!tieneAccesoComunidad(usuario.asignaciones, comunidadId)) {
      throw new ForbiddenException('No tiene acceso a esta comunidad');
    }
  }
}
