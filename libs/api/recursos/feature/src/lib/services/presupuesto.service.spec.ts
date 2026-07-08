import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PresupuestoService } from './presupuesto.service';

function crearServicio(opciones: { existente?: unknown } = {}) {
  const presupuestoRepository = {
    findOne: jest.fn().mockResolvedValue(opciones.existente ?? null),
    create: jest.fn((datos: Record<string, unknown>) => ({ ...datos })),
    save: jest.fn(async (datos: Record<string, unknown>) => ({ id: 1, ...datos })),
    find: jest.fn(),
  };

  const servicio = new PresupuestoService(presupuestoRepository as never);
  return { servicio, presupuestoRepository };
}

describe('PresupuestoService.crear', () => {
  it('crea el presupuesto con el monto formateado a 2 decimales', async () => {
    const { servicio } = crearServicio();

    const presupuesto = await servicio.crear({ comunidadId: 4, periodoCensalId: 1, monto: 1500000 });

    expect(presupuesto).toEqual(expect.objectContaining({ comunidadId: 4, periodoCensalId: 1, monto: '1500000.00' }));
  });

  it('rechaza si ya existe un presupuesto para esa comunidad y periodo', async () => {
    const { servicio } = crearServicio({ existente: { id: 1, comunidadId: 4, periodoCensalId: 1 } });

    await expect(servicio.crear({ comunidadId: 4, periodoCensalId: 1, monto: 1000 })).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PresupuestoService.actualizar', () => {
  it('lanza NotFoundException si el presupuesto no existe', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.actualizar(999, { monto: 1000 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza monto y observaciones', async () => {
    const { servicio, presupuestoRepository } = crearServicio();
    presupuestoRepository.findOne.mockResolvedValue({ id: 1, comunidadId: 4, periodoCensalId: 1, monto: '1000.00', observaciones: null });

    const actualizado = await servicio.actualizar(1, { monto: 2500.5, observaciones: 'Ajuste por inflación' });

    expect(actualizado).toEqual(expect.objectContaining({ monto: '2500.50', observaciones: 'Ajuste por inflación' }));
  });
});
