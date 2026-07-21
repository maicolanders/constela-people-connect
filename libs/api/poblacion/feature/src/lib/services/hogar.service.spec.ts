import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { ClasificacionUbicacion, EstadoHogar, RolCodigo } from '@censo/shared-data-access';
import { RegistrarUbicacionHogarDto } from '@censo/api-georreferenciacion-feature';
import { HogarService } from './hogar.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }],
  };
}

const dtoUbicacion: RegistrarUbicacionHogarDto = {
  ubicacionGeograficaId: 7,
  latitud: 2.4448,
  longitud: -76.6147,
  capturadoEn: '2026-07-06T10:00:00.000Z',
  clasificacion: ClasificacionUbicacion.RURAL,
};

describe('HogarService.registrarUbicacion / obtenerUbicacion', () => {
  const hogar = { id: 10, comunidadId: 3, estado: EstadoHogar.ACTIVO };

  function crearServicio() {
    const hogarRepository = { findOne: jest.fn().mockResolvedValue(hogar) };
    const periodoCensalService = { assertAbierto: jest.fn() };
    const hogarUbicacionService = {
      upsert: jest.fn().mockResolvedValue({ id: 1, hogarId: 10, comunidadId: 3 }),
      obtenerPorHogar: jest.fn().mockResolvedValue({ id: 1, hogarId: 10, comunidadId: 3 }),
    };
    const servicio = new HogarService(hogarRepository as never, periodoCensalService as never, hogarUbicacionService as never);
    return { servicio, hogarRepository, hogarUbicacionService };
  }

  it('registrarUbicacion delega en HogarUbicacionService con el comunidadId real del hogar cargado', async () => {
    const { servicio, hogarUbicacionService } = crearServicio();

    await servicio.registrarUbicacion(10, dtoUbicacion, crearUsuario());

    expect(hogarUbicacionService.upsert).toHaveBeenCalledWith(10, 3, dtoUbicacion);
  });

  it('ignora cualquier comunidadId que el DTO pudiera traer: siempre usa el del hogar real', async () => {
    const { servicio, hogarUbicacionService } = crearServicio();
    const dtoConComunidadFalsificada = { ...dtoUbicacion, comunidadId: 999 } as RegistrarUbicacionHogarDto;

    await servicio.registrarUbicacion(10, dtoConComunidadFalsificada, crearUsuario());

    expect(hogarUbicacionService.upsert).toHaveBeenCalledWith(10, 3, dtoConComunidadFalsificada);
    expect(hogarUbicacionService.upsert.mock.calls[0][1]).toBe(3);
  });

  it('obtenerUbicacion verifica acceso al hogar antes de delegar', async () => {
    const { servicio, hogarRepository, hogarUbicacionService } = crearServicio();

    await servicio.obtenerUbicacion(10, crearUsuario());

    expect(hogarRepository.findOne).toHaveBeenCalled();
    expect(hogarUbicacionService.obtenerPorHogar).toHaveBeenCalledWith(10);
  });
});

describe('HogarService.listar', () => {
  function crearServicio(resultado: unknown[] = []) {
    const qb = {
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(resultado),
    };
    const hogarRepository = { createQueryBuilder: jest.fn().mockReturnValue(qb) };
    const servicio = new HogarService(hogarRepository as never, {} as never, {} as never);
    return { servicio, qb, hogarRepository };
  }

  it('filtra por estado cuando se provee (buscador de hogares destino: solo activos)', async () => {
    const { servicio, qb } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, estado: EstadoHogar.ACTIVO });

    expect(qb.andWhere).toHaveBeenCalledWith('hogar.estado = :estado', { estado: EstadoHogar.ACTIVO });
  });

  it('filtra por búsqueda (dirección o nombre/apellido del jefe de hogar) uniendo con Habitante sin seleccionar sus columnas', async () => {
    const { servicio, qb } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, busqueda: 'Perez' });

    // Sin addSelect: nunca se serializan columnas de Habitante (evita exponer numeroDocumento sin redactar).
    expect(qb.leftJoin).toHaveBeenCalledWith(expect.anything(), 'jefe', 'jefe.id = hogar.jefeHogarId');
    expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('ILIKE'), { termino: '%Perez%' });
  });

  it('rechaza si el usuario no tiene acceso a la comunidad solicitada', async () => {
    const { servicio } = crearServicio();

    await expect(servicio.listar(crearUsuario(9), { comunidadId: 3 })).rejects.toThrow(ForbiddenException);
  });

  it('filtra por un lote acotado de ids (resolución hogarId -> uuid de una página de habitantes)', async () => {
    const { servicio, qb } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, ids: [10, 20, 30] });

    expect(qb.andWhere).toHaveBeenCalledWith('hogar.id IN (:...ids)', { ids: [10, 20, 30] });
  });

  it('ignora el filtro de ids cuando el arreglo viene vacío', async () => {
    const { servicio, qb } = crearServicio();

    await servicio.listar(crearUsuario(), { comunidadId: 3, ids: [] });

    expect(qb.andWhere).not.toHaveBeenCalledWith(expect.stringContaining('IN (:...ids)'), expect.anything());
  });
});

describe('HogarService.asignarVivienda', () => {
  it('carga el hogar, fija viviendaId y lo guarda (mismo patrón que actualizarJefeHogar)', async () => {
    const hogar = { id: 10, comunidadId: 3, estado: EstadoHogar.ACTIVO, viviendaId: null as number | null };
    const hogarRepository = {
      findOne: jest.fn().mockResolvedValue(hogar),
      save: jest.fn().mockImplementation((h) => Promise.resolve(h)),
    };
    const servicio = new HogarService(hogarRepository as never, {} as never, {} as never);

    await servicio.asignarVivienda(10, 77);

    expect(hogarRepository.save).toHaveBeenCalledWith(expect.objectContaining({ viviendaId: 77 }));
  });
});

describe('HogarService.actualizarDireccionPropia (Fase 14, autogestión)', () => {
  it('actualiza direccionReferencia sin exigir usuario ni periodo abierto', async () => {
    const hogar = { id: 10, comunidadId: 3, direccionReferencia: null as string | null };
    const hogarRepository = {
      findOne: jest.fn().mockResolvedValue(hogar),
      save: jest.fn().mockImplementation((h) => Promise.resolve(h)),
    };
    const servicio = new HogarService(hogarRepository as never, {} as never, {} as never);

    const resultado = await servicio.actualizarDireccionPropia(10, 'Vereda El Cairo, casa azul');

    expect(resultado).toEqual(expect.objectContaining({ direccionReferencia: 'Vereda El Cairo, casa azul' }));
    expect(hogarRepository.findOne).toHaveBeenCalledWith({ where: { id: 10 } });
  });
});
