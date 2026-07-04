import { AuditableBaseEntity, Auditoria } from '@censo/api-shared-data-access';
import { ClsService } from 'nestjs-cls';
import { DataSource, EntityMetadata } from 'typeorm';
import { AuditSubscriber } from './audit.subscriber';

class HabitanteDePrueba extends AuditableBaseEntity {
  nombres!: string;
}

function crearRepositorioAuditoriaFalso() {
  const guardadas: Partial<Auditoria>[] = [];
  return {
    create: jest.fn((datos: Partial<Auditoria>) => datos),
    save: jest.fn(async (registro: Partial<Auditoria>) => {
      guardadas.push(registro);
      return registro;
    }),
    guardadas,
  };
}

function crearClsService(userId: number | null): ClsService {
  return { get: jest.fn().mockReturnValue(userId) } as unknown as ClsService;
}

describe('AuditSubscriber', () => {
  let dataSource: { subscribers: unknown[] };

  beforeEach(() => {
    dataSource = { subscribers: [] };
  });

  it('se registra a sí mismo como subscriber al construirse', () => {
    const subscriber = new AuditSubscriber(dataSource as unknown as DataSource, crearClsService(1));
    expect(dataSource.subscribers).toContain(subscriber);
  });

  describe('beforeInsert / afterInsert', () => {
    it('asigna createdBy/updatedBy con el usuario del contexto CLS y crea una auditoría de creación', async () => {
      const subscriber = new AuditSubscriber(dataSource as unknown as DataSource, crearClsService(7));
      const entidad = new HabitanteDePrueba();
      entidad.id = 42;

      subscriber.beforeInsert({ entity: entidad } as never);
      expect(entidad.createdBy).toBe(7);
      expect(entidad.updatedBy).toBe(7);

      const repoAuditoria = crearRepositorioAuditoriaFalso();
      await subscriber.afterInsert({
        entity: entidad,
        metadata: { tableName: 'habitantes' } as EntityMetadata,
        manager: { getRepository: () => repoAuditoria },
      } as never);

      expect(repoAuditoria.guardadas).toEqual([
        expect.objectContaining({ tabla: 'habitantes', registroId: 42, accion: 'crear', usuarioId: 7 }),
      ]);
    });

    it('no falla si la entidad insertada no es auditable', async () => {
      const subscriber = new AuditSubscriber(dataSource as unknown as DataSource, crearClsService(7));
      await expect(subscriber.afterInsert({ entity: { id: 1 } } as never)).resolves.toBeUndefined();
    });
  });

  describe('afterUpdate', () => {
    it('registra una fila de auditoría por cada columna modificada', async () => {
      const subscriber = new AuditSubscriber(dataSource as unknown as DataSource, crearClsService(3));
      const entidadNueva = new HabitanteDePrueba();
      entidadNueva.id = 5;
      entidadNueva.nombres = 'Nombre Nuevo';
      const entidadAnterior = new HabitanteDePrueba();
      entidadAnterior.id = 5;
      entidadAnterior.nombres = 'Nombre Viejo';

      const repoAuditoria = crearRepositorioAuditoriaFalso();
      await subscriber.afterUpdate({
        entity: entidadNueva,
        databaseEntity: entidadAnterior,
        metadata: { tableName: 'habitantes' } as EntityMetadata,
        updatedColumns: [{ propertyName: 'nombres', getEntityValue: (e: HabitanteDePrueba) => e.nombres }],
        manager: { getRepository: () => repoAuditoria },
      } as never);

      expect(repoAuditoria.guardadas).toEqual([
        expect.objectContaining({
          tabla: 'habitantes',
          registroId: 5,
          campo: 'nombres',
          valorAnterior: 'Nombre Viejo',
          valorNuevo: 'Nombre Nuevo',
          accion: 'actualizar',
          usuarioId: 3,
        }),
      ]);
    });

    it('no registra nada si no hay columnas modificadas', async () => {
      const subscriber = new AuditSubscriber(dataSource as unknown as DataSource, crearClsService(3));
      const entidad = new HabitanteDePrueba();
      entidad.id = 5;

      const repoAuditoria = crearRepositorioAuditoriaFalso();
      await subscriber.afterUpdate({
        entity: entidad,
        databaseEntity: entidad,
        metadata: { tableName: 'habitantes' } as EntityMetadata,
        updatedColumns: [],
        manager: { getRepository: () => repoAuditoria },
      } as never);

      expect(repoAuditoria.guardadas).toHaveLength(0);
    });
  });
});
