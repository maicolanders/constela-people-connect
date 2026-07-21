import { NotFoundException } from '@nestjs/common';
import { HabitanteEtnia } from '@censo/api-etnia-vulnerabilidad-data-access';
import { ConstanciaAfiliacionService } from './constancia-afiliacion.service';

describe('ConstanciaAfiliacionService', () => {
  it('genera un documento cuando el habitante tiene resguardo/territorio asociado', async () => {
    const etnia = { id: 1, habitanteId: 101, etniaCatalogoItemId: 5, resguardoUbicacionGeograficaId: 20 } as HabitanteEtnia;
    const etniaVulnerabilidadService = { obtenerPorHabitante: jest.fn().mockResolvedValue(etnia) };
    const habitanteService = {
      obtener: jest.fn().mockResolvedValue({ nombres: 'Ana', apellidos: 'Tunubala', numeroDocumento: '123456' }),
    };
    const catalogoItemRepository = { findOne: jest.fn().mockResolvedValue({ nombre: 'Nasa' }) };
    const dataSource = { query: jest.fn().mockResolvedValue([{ nombre: 'Resguardo El Cairo' }]) };

    const servicio = new ConstanciaAfiliacionService(
      etniaVulnerabilidadService as never,
      habitanteService as never,
      catalogoItemRepository as never,
      dataSource as never,
    );

    const documento = await servicio.generar(101);

    expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('ubicaciones_geograficas'), [20]);
    expect(documento).toBeDefined();
  });

  it('rechaza (404) si el habitante no tiene resguardo/territorio asociado', async () => {
    const etnia = { id: 1, habitanteId: 101, etniaCatalogoItemId: 5, resguardoUbicacionGeograficaId: null } as HabitanteEtnia;
    const etniaVulnerabilidadService = { obtenerPorHabitante: jest.fn().mockResolvedValue(etnia) };
    const servicio = new ConstanciaAfiliacionService(
      etniaVulnerabilidadService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(servicio.generar(101)).rejects.toThrow(NotFoundException);
  });
});
