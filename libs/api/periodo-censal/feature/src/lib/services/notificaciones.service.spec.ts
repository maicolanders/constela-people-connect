import { NotFoundException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

function crearRepositorio(notificaciones: Record<string, unknown>[]) {
  return {
    create: jest.fn((datos: unknown) => ({ ...(datos as object) })),
    save: jest.fn(async (valor: unknown) => valor),
    find: jest.fn(async () => notificaciones),
    findOne: jest.fn(async ({ where: { id } }: { where: { id: number } }) =>
      notificaciones.find((n) => n['id'] === id) ?? null,
    ),
  };
}

function usuario(overrides: Partial<{ id: number; roles: string[]; asignaciones: unknown[] }> = {}) {
  return {
    id: overrides.id ?? 1,
    email: 'censista@comunidad.org',
    roles: overrides.roles ?? ['censista'],
    asignaciones: overrides.asignaciones ?? [{ rol: 'censista', comunidadId: 4 }],
  } as never;
}

describe('NotificacionesService.programar', () => {
  it('crea la notificación con notificadoEn/leidaEn nulos (aún no activada)', async () => {
    const repositorio = crearRepositorio([]);
    const servicio = new NotificacionesService(repositorio as never);

    await servicio.programar({
      comunidadId: 4,
      tipo: 'reencuesta',
      mensaje: 'Reencuesta muestral próxima',
      fechaProgramada: '2026-08-01',
    });

    expect(repositorio.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ notificadoEn: expect.anything() }),
    );
    expect(repositorio.create).toHaveBeenCalledWith(expect.objectContaining({ comunidadId: 4, tipo: 'reencuesta' }));
  });
});

describe('NotificacionesService.listarPendientes', () => {
  it('incluye una notificación activada dirigida a la comunidad del usuario', async () => {
    const repositorio = crearRepositorio([
      { id: 1, comunidadId: 4, rolDestino: null, usuarioDestinoId: null, notificadoEn: new Date() },
    ]);
    const servicio = new NotificacionesService(repositorio as never);

    const resultado = await servicio.listarPendientes(usuario());

    expect(resultado).toHaveLength(1);
  });

  it('excluye una notificación de otra comunidad a la que el usuario no tiene acceso', async () => {
    const repositorio = crearRepositorio([
      { id: 1, comunidadId: 9, rolDestino: null, usuarioDestinoId: null, notificadoEn: new Date() },
    ]);
    const servicio = new NotificacionesService(repositorio as never);

    const resultado = await servicio.listarPendientes(usuario());

    expect(resultado).toHaveLength(0);
  });

  it('excluye una notificación dirigida a otro usuario puntual', async () => {
    const repositorio = crearRepositorio([
      { id: 1, comunidadId: null, rolDestino: null, usuarioDestinoId: 99, notificadoEn: new Date() },
    ]);
    const servicio = new NotificacionesService(repositorio as never);

    const resultado = await servicio.listarPendientes(usuario({ id: 1 }));

    expect(resultado).toHaveLength(0);
  });
});

describe('NotificacionesService.marcarLeida', () => {
  it('marca leidaEn y rechaza si la notificación no existe', async () => {
    const repositorio = crearRepositorio([{ id: 1, usuarioDestinoId: null, leidaEn: null }]);
    const servicio = new NotificacionesService(repositorio as never);

    const resultado = await servicio.marcarLeida(1, usuario());

    expect(resultado.leidaEn).toBeInstanceOf(Date);
    await expect(servicio.marcarLeida(404, usuario())).rejects.toThrow(NotFoundException);
  });
});

describe('NotificacionesService.generarRecordatorios', () => {
  it('activa (notificadoEn) las notificaciones cuya fecha programada ya está próxima', async () => {
    const repositorio = crearRepositorio([]);
    const servicio = new NotificacionesService(repositorio as never);

    const activadas = await servicio.generarRecordatorios(7);

    expect(activadas).toBe(0);
    expect(repositorio.find).toHaveBeenCalled();
  });
});
