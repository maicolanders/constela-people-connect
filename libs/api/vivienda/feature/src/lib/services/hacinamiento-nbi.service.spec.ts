import { NotFoundException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { EstadoServicio, RolCodigo } from '@censo/shared-data-access';
import { HacinamientoNbiService } from './hacinamiento-nbi.service';

function crearUsuario(): UsuarioAutenticado {
  return {
    id: 1,
    email: 'censista@censo.test',
    roles: [RolCodigo.CENSISTA],
    asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId: 3 }],
  };
}

const viviendaAdecuada = {
  id: 77,
  numeroDormitorios: 2,
  tipoVivienda: { codigo: 'casa' },
  materialPared: { codigo: 'bloque_ladrillo' },
  materialPiso: { codigo: 'cemento' },
};

function crearServicio(opciones: {
  hogar?: unknown;
  vivienda?: unknown;
  habitantesActivos?: number;
  servicios?: Array<{ tipoServicioCatalogoItemId: number; estado: EstadoServicio; tipoServicio: { codigo: string } }>;
}) {
  const hogar = opciones.hogar ?? { id: 10, viviendaId: 77 };
  const habitanteRepository = { count: jest.fn().mockResolvedValue(opciones.habitantesActivos ?? 2) };
  const viviendaRepository = { findOne: jest.fn().mockResolvedValue(opciones.vivienda ?? viviendaAdecuada) };
  const servicioRepository = { find: jest.fn().mockResolvedValue(opciones.servicios ?? []) };
  const hogarService = { obtener: jest.fn().mockResolvedValue(hogar) };

  const servicio = new HacinamientoNbiService(
    habitanteRepository as never,
    viviendaRepository as never,
    servicioRepository as never,
    hogarService as never,
  );

  return { servicio };
}

function servicioAdecuado(codigo: string) {
  return { tipoServicioCatalogoItemId: 1, estado: EstadoServicio.SI, tipoServicio: { codigo } };
}

describe('HacinamientoNbiService.calcularParaHogar', () => {
  it('lanza NotFoundException si el hogar no tiene vivienda registrada', async () => {
    const { servicio } = crearServicio({ hogar: { id: 10, viviendaId: null } });

    await expect(servicio.calcularParaHogar(10, crearUsuario())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('calcula el hacinamiento (habitantes/dormitorios) sin marcarlo crítico si es <= 3', async () => {
    const { servicio } = crearServicio({
      habitantesActivos: 6,
      servicios: [servicioAdecuado('agua_potable'), servicioAdecuado('saneamiento')],
    });

    const resultado = await servicio.calcularParaHogar(10, crearUsuario());

    expect(resultado.hacinamiento).toBe(3);
    expect(resultado.hacinamientoCritico).toBe(false);
  });

  it('marca hacinamiento crítico si supera 3 habitantes por dormitorio', async () => {
    const { servicio } = crearServicio({
      habitantesActivos: 7,
      servicios: [servicioAdecuado('agua_potable'), servicioAdecuado('saneamiento')],
    });

    const resultado = await servicio.calcularParaHogar(10, crearUsuario());

    expect(resultado.hacinamientoCritico).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('marca vivienda inadecuada si el tipo o material predominante lo indica', async () => {
    const { servicio } = crearServicio({
      vivienda: { ...viviendaAdecuada, tipoVivienda: { codigo: 'choza_rancho' } },
      servicios: [servicioAdecuado('agua_potable'), servicioAdecuado('saneamiento')],
    });

    const resultado = await servicio.calcularParaHogar(10, crearUsuario());

    expect(resultado.viviendaInadecuada).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('marca servicios inadecuados si falta acueducto o saneamiento adecuado', async () => {
    const { servicio } = crearServicio({
      servicios: [{ tipoServicioCatalogoItemId: 1, estado: EstadoServicio.NO, tipoServicio: { codigo: 'agua_potable' } }],
    });

    const resultado = await servicio.calcularParaHogar(10, crearUsuario());

    expect(resultado.serviciosInadecuados).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('sin ningún componente insatisfecho, tieneNbi es false', async () => {
    const { servicio } = crearServicio({
      habitantesActivos: 2,
      servicios: [servicioAdecuado('agua_potable'), servicioAdecuado('saneamiento')],
    });

    const resultado = await servicio.calcularParaHogar(10, crearUsuario());

    expect(resultado).toEqual(
      expect.objectContaining({ hacinamientoCritico: false, viviendaInadecuada: false, serviciosInadecuados: false, tieneNbi: false }),
    );
  });
});
