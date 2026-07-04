import { Injectable } from '@nestjs/common';
import { AuditableBaseEntity, Auditoria } from '@censo/api-shared-data-access';
import { ClsService } from 'nestjs-cls';
import {
  DataSource,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  Repository,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';

interface DatosAuditoria {
  tabla: string;
  registroId: number;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  accion: Auditoria['accion'];
}

/**
 * Traza createdBy/updatedBy y el historial campo a campo en `auditorias`
 * (RNF-04) para toda entidad que extienda AuditableBaseEntity. Se registra
 * como subscriber global de TypeORM en el constructor.
 *
 * Nota: el hook de baja solo se dispara con `repository.softRemove(entity)`;
 * `repository.softDelete(criteria)` es una query directa y TypeORM no
 * despacha subscribers para ella, así que los servicios de dominio deben
 * usar softRemove() para que quede auditado.
 */
@Injectable()
@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  constructor(
    dataSource: DataSource,
    private readonly cls: ClsService,
  ) {
    dataSource.subscribers.push(this);
  }

  beforeInsert(event: InsertEvent<unknown>): void {
    const entity = event.entity;
    if (!this.esAuditable(entity)) return;
    const usuarioId = this.obtenerUsuarioActual();
    entity.createdBy = usuarioId;
    entity.updatedBy = usuarioId;
  }

  beforeUpdate(event: UpdateEvent<unknown>): void {
    const entity = event.entity;
    if (!this.esAuditable(entity)) return;
    entity.updatedBy = this.obtenerUsuarioActual();
  }

  beforeSoftRemove(event: SoftRemoveEvent<unknown>): void {
    const entity = event.entity;
    if (!this.esAuditable(entity)) return;
    entity.updatedBy = this.obtenerUsuarioActual();
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    const entity = event.entity;
    if (!this.esAuditable(entity)) return;
    await this.registrarAuditoria(event.manager.getRepository(Auditoria), {
      tabla: event.metadata.tableName,
      registroId: entity.id,
      campo: null,
      valorAnterior: null,
      valorNuevo: null,
      accion: 'crear',
    });
  }

  async afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    const entity = event.entity;
    if (!this.esAuditable(entity) || !event.databaseEntity || !event.updatedColumns?.length) return;

    const repoAuditoria = event.manager.getRepository(Auditoria);
    for (const columna of event.updatedColumns) {
      await this.registrarAuditoria(repoAuditoria, {
        tabla: event.metadata.tableName,
        registroId: entity.id,
        campo: columna.propertyName,
        valorAnterior: this.serializar(columna.getEntityValue(event.databaseEntity)),
        valorNuevo: this.serializar(columna.getEntityValue(entity)),
        accion: 'actualizar',
      });
    }
  }

  async afterSoftRemove(event: SoftRemoveEvent<unknown>): Promise<void> {
    const entity = event.entity;
    if (!this.esAuditable(entity)) return;
    await this.registrarAuditoria(event.manager.getRepository(Auditoria), {
      tabla: event.metadata.tableName,
      registroId: entity.id,
      campo: 'deletedAt',
      valorAnterior: null,
      valorNuevo: this.serializar(entity.deletedAt),
      accion: 'eliminar',
    });
  }

  private esAuditable(entity: unknown): entity is AuditableBaseEntity {
    return entity instanceof AuditableBaseEntity;
  }

  private async registrarAuditoria(repoAuditoria: Repository<Auditoria>, datos: DatosAuditoria): Promise<void> {
    const registro = repoAuditoria.create({
      ...datos,
      usuarioId: this.obtenerUsuarioActual(),
      fechaHora: new Date(),
    });
    await repoAuditoria.save(registro);
  }

  private obtenerUsuarioActual(): number | null {
    try {
      return this.cls.get<number | null>('userId') ?? null;
    } catch {
      return null;
    }
  }

  private serializar(valor: unknown): string | null {
    if (valor === null || valor === undefined) return null;
    return valor instanceof Date ? valor.toISOString() : typeof valor === 'string' ? valor : JSON.stringify(valor);
  }
}
