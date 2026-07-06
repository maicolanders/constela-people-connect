import { NotFoundException } from '@nestjs/common';
import { UbicacionGeograficaService } from './ubicacion-geografica.service';

describe('UbicacionGeograficaService', () => {
  function crearServicio() {
    const repositorio = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((datos) => datos),
      save: jest.fn((entidad) => Promise.resolve({ id: 99, ...entidad })),
      softRemove: jest.fn(),
    };
    const servicio = new UbicacionGeograficaService(repositorio as never);
    return { servicio, repositorio };
  }

  it('listar() sin padreId busca raíces (padreId IS NULL)', async () => {
    const { servicio, repositorio } = crearServicio();
    repositorio.find.mockResolvedValue([]);

    await servicio.listar();

    expect(repositorio.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ padreId: expect.anything() }) }),
    );
  });

  it('listar(padreId) busca hijos directos de ese nodo', async () => {
    const { servicio, repositorio } = crearServicio();
    repositorio.find.mockResolvedValue([{ id: 2, padreId: 1 }]);

    const resultado = await servicio.listar(1);

    expect(repositorio.find).toHaveBeenCalledWith({ where: { padreId: 1 }, order: { nombre: 'ASC' } });
    expect(resultado).toEqual([{ id: 2, padreId: 1 }]);
  });

  it('obtener() lanza NotFoundException si el nodo no existe', async () => {
    const { servicio, repositorio } = crearServicio();
    repositorio.findOne.mockResolvedValue(null);

    await expect(servicio.obtener(1)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('crear() con padreId verifica que el padre exista antes de guardar', async () => {
    const { servicio, repositorio } = crearServicio();
    repositorio.findOne.mockResolvedValue({ id: 1 });

    await servicio.crear({ nivelGeograficoCatalogoItemId: 5, padreId: 1, nombre: 'Popayán' });

    expect(repositorio.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(repositorio.save).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Popayán', padreId: 1, activo: true }),
    );
  });

  it('crear() rechaza si el padreId indicado no existe', async () => {
    const { servicio, repositorio } = crearServicio();
    repositorio.findOne.mockResolvedValue(null);

    await expect(servicio.crear({ nivelGeograficoCatalogoItemId: 5, padreId: 999, nombre: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
