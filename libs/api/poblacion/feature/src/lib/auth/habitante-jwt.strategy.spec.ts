import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Habitante } from '@censo/api-poblacion-data-access';
import { EstadoHabitante, SexoHabitante } from '@censo/shared-data-access';
import { Repository } from 'typeorm';
import { HabitanteJwtStrategy } from './habitante-jwt.strategy';

function crearHabitante(overrides: Partial<Habitante> = {}): Habitante {
  return {
    id: 1,
    hogarId: 10,
    comunidadId: 100,
    estado: EstadoHabitante.ACTIVO,
    credencialActiva: true,
    sexo: SexoHabitante.MASCULINO,
    ...overrides,
  } as Habitante;
}

describe('HabitanteJwtStrategy', () => {
  let habitanteRepository: jest.Mocked<Repository<Habitante>>;
  let strategy: HabitanteJwtStrategy;

  beforeEach(() => {
    habitanteRepository = { findOne: jest.fn() } as unknown as jest.Mocked<Repository<Habitante>>;
    const configService = new ConfigService({ JWT_HABITANTE_ACCESS_SECRET: 'test-secret' });
    strategy = new HabitanteJwtStrategy(configService, habitanteRepository);
  });

  it('retorna el actor autenticado cuando el habitante sigue activo con credencial activa', async () => {
    habitanteRepository.findOne.mockResolvedValue(crearHabitante());

    const actor = await strategy.validate({ sub: 1, comunidadId: 100, hogarId: 10 });

    expect(actor).toEqual({ habitanteId: 1, comunidadId: 100, hogarId: 10 });
  });

  it('rechaza si el habitante fue dado de baja después de emitido el token (siempre relee BD)', async () => {
    habitanteRepository.findOne.mockResolvedValue(crearHabitante({ estado: EstadoHabitante.FALLECIDO }));

    await expect(strategy.validate({ sub: 1, comunidadId: 100, hogarId: 10 })).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si la credencial ya no está activa', async () => {
    habitanteRepository.findOne.mockResolvedValue(crearHabitante({ credencialActiva: false }));

    await expect(strategy.validate({ sub: 1, comunidadId: 100, hogarId: 10 })).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza si el habitante ya no existe', async () => {
    habitanteRepository.findOne.mockResolvedValue(null);

    await expect(strategy.validate({ sub: 999, comunidadId: 100, hogarId: 10 })).rejects.toThrow(UnauthorizedException);
  });
});
