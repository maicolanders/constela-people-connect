import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoServicio, RolCodigo } from '@censo/shared-data-access';
import { CoberturaServiciosService } from './cobertura-servicios.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.ANALISTA], asignaciones: [{ rol: RolCodigo.ANALISTA, comunidadId }] };
}

const TIPOS_SERVICIO = [
  { id: 1, codigo: 'agua_potable' },
  { id: 2, codigo: 'saneamiento' },
];

function crearHogares(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({ id: i + 1, viviendaId: i + 1 }));
}

function crearServicio(opciones: { hogares?: unknown[]; servicios?: unknown[] }) {
  const servicioRepository = { find: jest.fn().mockResolvedValue(opciones.servicios ?? []) };
  const catalogoService = { listarItemsPorTipo: jest.fn().mockResolvedValue(TIPOS_SERVICIO) };
  const hogarService = { listar: jest.fn().mockResolvedValue(opciones.hogares ?? []) };

  const servicio = new CoberturaServiciosService(servicioRepository as never, catalogoService as never, hogarService as never);
  return { servicio, hogarService };
}

describe('CoberturaServiciosService.obtenerCobertura', () => {
  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio({});

    await expect(servicio.obtenerCobertura(crearUsuario(9), 3, 1)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcula el porcentaje de cobertura por tipo de servicio', async () => {
    const hogares = crearHogares(6);
    const servicios = [
      { viviendaId: 1, tipoServicioCatalogoItemId: 1, estado: EstadoServicio.SI },
      { viviendaId: 2, tipoServicioCatalogoItemId: 1, estado: EstadoServicio.SI },
      { viviendaId: 3, tipoServicioCatalogoItemId: 1, estado: EstadoServicio.SI },
      { viviendaId: 1, tipoServicioCatalogoItemId: 2, estado: EstadoServicio.SI },
    ];
    const { servicio } = crearServicio({ hogares, servicios });

    const resultado = await servicio.obtenerCobertura(crearUsuario(), 3, 1);

    expect(resultado).toEqual([
      expect.objectContaining({ tipoServicioCodigo: 'agua_potable', totalViviendas: 6, totalConAcceso: 3, porcentajeCobertura: 50 }),
      expect.objectContaining({ tipoServicioCodigo: 'saneamiento', totalViviendas: 6, totalConAcceso: 1, porcentajeCobertura: 16.7 }),
    ]);
  });

  it('suprime el resultado si hay menos viviendas que el umbral k-anonimity', async () => {
    const hogares = crearHogares(2);
    const { servicio } = crearServicio({ hogares, servicios: [] });

    const resultado = await servicio.obtenerCobertura(crearUsuario(), 3, 1);

    expect(resultado).toEqual([
      expect.objectContaining({ tipoServicioCodigo: 'agua_potable', totalViviendas: null, totalConAcceso: null, suprimido: true }),
      expect.objectContaining({ tipoServicioCodigo: 'saneamiento', totalViviendas: null, totalConAcceso: null, suprimido: true }),
    ]);
  });

  it('sin hogares en la comunidad/periodo, porcentaje queda null (no 0/0)', async () => {
    const { servicio } = crearServicio({ hogares: [], servicios: [] });

    const resultado = await servicio.obtenerCobertura(crearUsuario(), 3, 1);

    expect(resultado[0]).toEqual(expect.objectContaining({ totalViviendas: 0, porcentajeCobertura: null }));
  });
});
