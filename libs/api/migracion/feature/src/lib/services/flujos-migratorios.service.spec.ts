import { ForbiddenException } from '@nestjs/common';
import { UsuarioAutenticado } from '@censo/api-auth-data-access';
import { DireccionMigratoria, RolCodigo } from '@censo/shared-data-access';
import { FlujosMigratoriosQueryDto } from '../dto/flujos-migratorios-query.dto';
import { FlujosMigratoriosService } from './flujos-migratorios.service';

function crearUsuario(comunidadId: number | null = 3): UsuarioAutenticado {
  return { id: 1, email: 'u@censo.test', roles: [RolCodigo.CENSISTA], asignaciones: [{ rol: RolCodigo.CENSISTA, comunidadId }] };
}

function crearHabitantes(cantidad: number) {
  return Array.from({ length: cantidad }, (_, i) => ({ id: i + 1 }));
}

function movimiento(
  habitanteId: number,
  direccion: DireccionMigratoria,
  origenNombre: string | null,
  destinoNombre: string | null,
) {
  return {
    habitanteId,
    direccion,
    origenUbicacionGeografica: origenNombre ? { nombre: origenNombre } : null,
    origenDescripcionLibre: null,
    destinoUbicacionGeografica: destinoNombre ? { nombre: destinoNombre } : null,
    destinoDescripcionLibre: null,
  };
}

function crearServicio(opciones: { habitantes?: unknown[]; movimientos?: unknown[] }) {
  const movimientoRepository = { find: jest.fn().mockResolvedValue(opciones.movimientos ?? []) };
  const habitanteService = { listar: jest.fn().mockResolvedValue(opciones.habitantes ?? []) };

  const servicio = new FlujosMigratoriosService(movimientoRepository as never, habitanteService as never);
  return { servicio, movimientoRepository };
}

function dtoBase(overrides: Partial<FlujosMigratoriosQueryDto> = {}): FlujosMigratoriosQueryDto {
  return { comunidadId: 3, periodoCensalId: 1, ...overrides };
}

describe('FlujosMigratoriosService.obtener', () => {
  it('rechaza si el usuario no tiene acceso a la comunidad', async () => {
    const { servicio } = crearServicio({});

    await expect(servicio.obtener(crearUsuario(9), dtoBase())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('calcula el saldo neto (entradas - salidas) cuando hay suficientes eventos para no suprimir', async () => {
    const habitantes = crearHabitantes(10);
    const movimientos = [
      ...Array.from({ length: 7 }, (_, i) => movimiento(i + 1, DireccionMigratoria.ENTRADA, 'Popayán', 'Cali')),
      ...Array.from({ length: 5 }, (_, i) => movimiento(i + 1, DireccionMigratoria.SALIDA, 'Cali', 'Popayán')),
    ];
    const { servicio } = crearServicio({ habitantes, movimientos });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.totalEntradas).toBe(7);
    expect(resultado.totalSalidas).toBe(5);
    expect(resultado.saldoNeto).toBe(2);
  });

  it('suprime entradas/salidas (y el saldo neto) si alguno de los dos está por debajo del umbral k-anonimity', async () => {
    const habitantes = crearHabitantes(5);
    const movimientos = [movimiento(1, DireccionMigratoria.SALIDA, 'Cali', 'Popayán')];
    const { servicio } = crearServicio({ habitantes, movimientos });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.totalEntradas).toBe(0);
    expect(resultado.totalSalidas).toBeNull();
    expect(resultado.saldoNeto).toBeNull();
  });

  it('agrupa los flujos por origen→destino y suprime los grupos pequeños', async () => {
    const habitantes = crearHabitantes(10);
    const movimientos = [
      ...Array.from({ length: 6 }, () => movimiento(1, DireccionMigratoria.ENTRADA, 'Popayán', 'Cali')),
      movimiento(2, DireccionMigratoria.SALIDA, 'Cali', 'Bogotá'),
    ];
    const { servicio } = crearServicio({ habitantes, movimientos });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(resultado.flujos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origen: 'Popayán', destino: 'Cali', total: 6, suprimido: false }),
        expect.objectContaining({ origen: 'Cali', destino: 'Bogotá', total: null, suprimido: true }),
      ]),
    );
  });

  it('sin habitantes en la comunidad, no consulta movimientos y devuelve todo en cero', async () => {
    const { servicio, movimientoRepository } = crearServicio({ habitantes: [] });

    const resultado = await servicio.obtener(crearUsuario(), dtoBase());

    expect(movimientoRepository.find).not.toHaveBeenCalled();
    expect(resultado.totalEntradas).toBe(0);
    expect(resultado.totalSalidas).toBe(0);
    expect(resultado.saldoNeto).toBe(0);
  });
});
