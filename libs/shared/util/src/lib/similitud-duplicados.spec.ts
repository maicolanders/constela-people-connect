import { calcularSimilitudHabitante, esPosibleDuplicado } from './similitud-duplicados';

const base = {
  nombres: 'Maria Jose',
  apellidos: 'Tunubala Yule',
  fechaNacimiento: new Date('1995-03-10'),
  comunidadId: 1,
};

describe('calcularSimilitudHabitante', () => {
  it('retorna 1 para registros idénticos', () => {
    expect(calcularSimilitudHabitante(base, { ...base })).toBe(1);
  });

  it('retorna 0 si son de comunidades distintas, sin importar qué tan parecidos sean los nombres', () => {
    expect(calcularSimilitudHabitante(base, { ...base, comunidadId: 2 })).toBe(0);
  });

  it('detecta alta similitud con errores tipográficos menores en el nombre', () => {
    const conTypo = { ...base, nombres: 'Maria Jse' };
    expect(calcularSimilitudHabitante(base, conTypo)).toBeGreaterThan(0.85);
  });

  it('da un puntaje bajo para personas claramente distintas', () => {
    const otraPersona = {
      nombres: 'Carlos Andres',
      apellidos: 'Perez Gomez',
      fechaNacimiento: new Date('1970-01-01'),
      comunidadId: 1,
    };
    expect(calcularSimilitudHabitante(base, otraPersona)).toBeLessThan(0.3);
  });

  it('penaliza cuando la fecha de nacimiento no coincide aunque el nombre sea igual', () => {
    const otraFecha = { ...base, fechaNacimiento: new Date('2000-01-01') };
    const score = calcularSimilitudHabitante(base, otraFecha);
    expect(score).toBeCloseTo(0.8, 5);
  });
});

describe('esPosibleDuplicado', () => {
  it('marca como duplicado cuando el score supera el umbral', () => {
    expect(esPosibleDuplicado(base, { ...base })).toBe(true);
  });

  it('no marca como duplicado cuando el score está por debajo del umbral', () => {
    const otraPersona = {
      nombres: 'Carlos Andres',
      apellidos: 'Perez Gomez',
      fechaNacimiento: null,
      comunidadId: 1,
    };
    expect(esPosibleDuplicado(base, otraPersona)).toBe(false);
  });
});
