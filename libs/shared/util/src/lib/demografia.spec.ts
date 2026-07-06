import {
  calcularEdad,
  calcularGrupoQuinquenal,
  calcularHacinamiento,
  calcularIndiceEnvejecimiento,
  calcularRazonDependencia,
  calcularTasaPorMil,
} from './demografia';

describe('calcularEdad', () => {
  it('calcula la edad cuando ya pasó el cumpleaños este año', () => {
    expect(calcularEdad(new Date('1990-01-15'), new Date('2026-06-01'))).toBe(36);
  });

  it('calcula la edad cuando aún no llega el cumpleaños este año', () => {
    expect(calcularEdad(new Date('1990-12-15'), new Date('2026-06-01'))).toBe(35);
  });

  it('calcula la edad correctamente el día exacto del cumpleaños', () => {
    expect(calcularEdad(new Date('1990-06-01'), new Date('2026-06-01'))).toBe(36);
  });

  it('nunca retorna una edad negativa', () => {
    expect(calcularEdad(new Date('2026-06-02'), new Date('2026-06-01'))).toBe(0);
  });
});

describe('calcularGrupoQuinquenal', () => {
  it.each([
    [0, '0-4'],
    [4, '0-4'],
    [5, '5-9'],
    [37, '35-39'],
    [79, '75-79'],
    [80, '80+'],
    [95, '80+'],
  ])('edad %i -> grupo %s', (edad, grupoEsperado) => {
    expect(calcularGrupoQuinquenal(edad)).toBe(grupoEsperado);
  });

  it('lanza error con edad negativa', () => {
    expect(() => calcularGrupoQuinquenal(-1)).toThrow();
  });
});

describe('calcularHacinamiento', () => {
  it('divide habitantes entre dormitorios', () => {
    expect(calcularHacinamiento(6, 2)).toBe(3);
  });

  it('lanza error si no hay dormitorios', () => {
    expect(() => calcularHacinamiento(4, 0)).toThrow();
  });
});

describe('calcularRazonDependencia', () => {
  it('calcula (0-14 + 65+) / 15-64 * 100', () => {
    expect(calcularRazonDependencia(30, 10, 100)).toBe(40);
  });

  it('lanza error si la población de 15 a 64 años es cero', () => {
    expect(() => calcularRazonDependencia(10, 5, 0)).toThrow();
  });
});

describe('calcularIndiceEnvejecimiento', () => {
  it('calcula 65+ / 0-14 * 100', () => {
    expect(calcularIndiceEnvejecimiento(20, 40)).toBe(50);
  });

  it('lanza error si la población de 0 a 14 años es cero', () => {
    expect(() => calcularIndiceEnvejecimiento(10, 0)).toThrow();
  });
});

describe('calcularTasaPorMil', () => {
  it('calcula eventos / poblacionBase * 1000', () => {
    expect(calcularTasaPorMil(5, 1000)).toBe(5);
  });

  it('funciona igual para natalidad y mortalidad aparente (misma fórmula)', () => {
    expect(calcularTasaPorMil(2, 500)).toBe(4);
  });

  it('lanza error si la población base es cero', () => {
    expect(() => calcularTasaPorMil(1, 0)).toThrow();
  });
});
