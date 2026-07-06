import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { ClasificacionUbicacion, EstadoHabitante, EstadoHogar, RolCodigo } from '@censo/shared-data-access';
import { MapaHogaresService } from './mapa-hogares.service';

function crearUsuario(roles: RolCodigo[], comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles, asignaciones: roles.map((rol) => ({ rol, comunidadId })) };
}

function crearHogares(cantidad: number, comunidadId = 3) {
  return Array.from({ length: cantidad }, (_, i) => ({
    id: i + 1,
    comunidadId,
    estado: EstadoHogar.ACTIVO,
  }));
}

function crearUbicaciones(hogarIds: number[]) {
  return hogarIds.map((hogarId) => ({
    hogarId,
    ubicacionGeograficaId: 7,
    coordenadas: { type: 'Point' as const, coordinates: [-76.6, 2.44] as [number, number] },
    clasificacion: ClasificacionUbicacion.RURAL,
    tipoTerritorioCatalogoItemId: null,
  }));
}

describe('MapaHogaresService', () => {
  function crearServicio(opciones: {
    hogares?: unknown[];
    ubicaciones?: unknown[];
    habitantesPorHogar?: Array<{ hogarId: number; estado: EstadoHabitante }>;
  }) {
    const habitanteRepository = { find: jest.fn().mockResolvedValue(opciones.habitantesPorHogar ?? []) };
    const hogarService = { listar: jest.fn().mockResolvedValue(opciones.hogares ?? []) };
    const hogarUbicacionService = { listarPorHogares: jest.fn().mockResolvedValue(opciones.ubicaciones ?? []) };
    const servicio = new MapaHogaresService(habitanteRepository as never, hogarService as never, hogarUbicacionService as never);
    return { servicio, habitanteRepository, hogarService, hogarUbicacionService };
  }

  it('rechaza si el usuario no tiene acceso a la comunidad solicitada', async () => {
    const { servicio } = crearServicio({});
    const usuario = crearUsuario([RolCodigo.CENSISTA], 5);

    await expect(servicio.obtener(usuario, 3, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('censista/líder/administrador reciben puntos individuales con coordenadas y densidad poblacional', async () => {
    const hogares = crearHogares(2);
    const ubicaciones = crearUbicaciones([1, 2]);
    const { servicio } = crearServicio({
      hogares,
      ubicaciones,
      habitantesPorHogar: [
        { hogarId: 1, estado: EstadoHabitante.ACTIVO },
        { hogarId: 1, estado: EstadoHabitante.ACTIVO },
        { hogarId: 2, estado: EstadoHabitante.ACTIVO },
      ],
    });
    const usuario = crearUsuario([RolCodigo.CENSISTA]);

    const resultado = await servicio.obtener(usuario, 3, 1);

    expect(resultado).toEqual([
      expect.objectContaining({ hogarId: 1, poblacionHogar: 2, coordenadas: expect.objectContaining({ type: 'Point' }) }),
      expect.objectContaining({ hogarId: 2, poblacionHogar: 1 }),
    ]);
  });

  it('analista recibe agregado por nodo geográfico, sin coordenadas exactas', async () => {
    const hogares = crearHogares(6);
    const ubicaciones = crearUbicaciones([1, 2, 3, 4, 5, 6]);
    const { servicio } = crearServicio({
      hogares,
      ubicaciones,
      habitantesPorHogar: [1, 2, 3, 4, 5, 6].map((hogarId) => ({ hogarId, estado: EstadoHabitante.ACTIVO })),
    });
    const usuario = crearUsuario([RolCodigo.ANALISTA]);

    const resultado = await servicio.obtener(usuario, 3, 1);

    expect(resultado).toEqual([
      expect.objectContaining({ ubicacionGeograficaId: 7, totalHogares: 6, totalHabitantes: 6, suprimido: false }),
    ]);
    expect(resultado[0]).not.toHaveProperty('coordenadas');
  });

  it('analista: nodo geográfico con menos hogares que el umbral k-anonimity se suprime', async () => {
    const hogares = crearHogares(2);
    const ubicaciones = crearUbicaciones([1, 2]);
    const { servicio } = crearServicio({
      hogares,
      ubicaciones,
      habitantesPorHogar: [1, 2].map((hogarId) => ({ hogarId, estado: EstadoHabitante.ACTIVO })),
    });
    const usuario = crearUsuario([RolCodigo.ANALISTA]);

    const resultado = await servicio.obtener(usuario, 3, 1);

    expect(resultado).toEqual([
      expect.objectContaining({ totalHogares: null, totalHabitantes: null, suprimido: true }),
    ]);
  });

  it('filtra hogares dados de baja (estado inactivo) antes de construir el mapa', async () => {
    const hogares = [
      { id: 1, comunidadId: 3, estado: EstadoHogar.ACTIVO },
      { id: 2, comunidadId: 3, estado: EstadoHogar.INACTIVO },
    ];
    const { servicio, hogarUbicacionService } = crearServicio({ hogares, ubicaciones: [] });
    const usuario = crearUsuario([RolCodigo.CENSISTA]);

    await servicio.obtener(usuario, 3, 1);

    expect(hogarUbicacionService.listarPorHogares).toHaveBeenCalledWith([1]);
  });
});
