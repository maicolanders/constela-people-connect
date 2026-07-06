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
