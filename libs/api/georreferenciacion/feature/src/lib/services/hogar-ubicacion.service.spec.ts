import { BadRequestException } from '@nestjs/common';
import { ClasificacionUbicacion } from '@censo/shared-data-access';
import { HogarUbicacionService } from './hogar-ubicacion.service';
import { RegistrarUbicacionHogarDto } from '../dto/registrar-ubicacion-hogar.dto';

function crearDto(overrides: Partial<RegistrarUbicacionHogarDto> = {}): RegistrarUbicacionHogarDto {
  return {
    ubicacionGeograficaId: 7,
    latitud: 2.4448,
    longitud: -76.6147,
    capturadoEn: '2026-07-06T10:00:00.000Z',
    clasificacion: ClasificacionUbicacion.RURAL,
    ...overrides,
  };
}

describe('HogarUbicacionService', () => {
  function crearServicio(opciones: { existente?: unknown } = {}) {
    const repositorio = {
      findOne: jest.fn().mockResolvedValue(opciones.existente ?? null),
      create: jest.fn((datos) => datos),
      save: jest.fn((entidad) => Promise.resolve({ id: 1, ...entidad })),
      find: jest.fn(),
    };
    const ubicacionGeograficaService = { obtener: jest.fn().mockResolvedValue({ id: 7 }) };
    const servicio = new HogarUbicacionService(repositorio as never, ubicacionGeograficaService as never);
    return { servicio, repositorio, ubicacionGeograficaService };
  }

  it('valida que la ubicación geográfica (nodo hoja) exista', async () => {
    const { servicio, ubicacionGeograficaService } = crearServicio();

    await servicio.upsert(10, 3, crearDto());

    expect(ubicacionGeograficaService.obtener).toHaveBeenCalledWith(7);
  });

  it('crea una nueva captura de ubicación con las coordenadas en formato GeoJSON', async () => {
    const { servicio, repositorio } = crearServicio();

    await servicio.upsert(10, 3, crearDto({ latitud: 2.44, longitud: -76.6 }));

    expect(repositorio.save).toHaveBeenCalledWith(
      expect.objectContaining({
        hogarId: 10,
        comunidadId: 3,
        coordenadas: { type: 'Point', coordinates: [-76.6, 2.44] },
      }),
    );
  });

  it('actualiza (upsert) la captura existente del mismo hogar en vez de duplicar', async () => {
    const existente = { id: 1, hogarId: 10, comunidadId: 3 };
    const { servicio, repositorio } = crearServicio({ existente });

    await servicio.upsert(10, 3, crearDto());

    expect(repositorio.create).not.toHaveBeenCalled();
    expect(repositorio.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('rechaza si el hogar ya tiene una ubicación registrada bajo otra comunidad', async () => {
    const existente = { id: 1, hogarId: 10, comunidadId: 99 };
    const { servicio } = crearServicio({ existente });

    await expect(servicio.upsert(10, 3, crearDto())).rejects.toBeInstanceOf(BadRequestException);
  });
});
