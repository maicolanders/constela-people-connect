export function calcularEdad(fechaNacimiento: Date, fechaReferencia: Date = new Date()): number {
  let edad = fechaReferencia.getFullYear() - fechaNacimiento.getFullYear();
  const noHaCumplidoAnios =
    fechaReferencia.getMonth() < fechaNacimiento.getMonth() ||
    (fechaReferencia.getMonth() === fechaNacimiento.getMonth() && fechaReferencia.getDate() < fechaNacimiento.getDate());

  if (noHaCumplidoAnios) {
    edad -= 1;
  }

  return Math.max(edad, 0);
}

/**
 * Grupo quinquenal de edad para la pirámide poblacional (RF-02-02): 0-4, 5-9, ..., 80+.
 */
export function calcularGrupoQuinquenal(edad: number): string {
  if (edad < 0) {
    throw new Error('La edad no puede ser negativa');
  }
  if (edad >= 80) {
    return '80+';
  }
  const inicio = Math.floor(edad / 5) * 5;
  return `${inicio}-${inicio + 4}`;
}

/**
 * Hacinamiento (RF-04-01): habitantes por dormitorio.
 */
export function calcularHacinamiento(numHabitantes: number, numDormitorios: number): number {
  if (numDormitorios <= 0) {
    throw new Error('El número de dormitorios debe ser mayor a cero');
  }
  return numHabitantes / numDormitorios;
}

/**
 * Razón de dependencia (RF-02-03): población en edades dependientes (0-14 y
 * 65+) por cada 100 personas en edad potencialmente activa (15-64).
 */
export function calcularRazonDependencia(poblacion0a14: number, poblacion65Mas: number, poblacion15a64: number): number {
  if (poblacion15a64 <= 0) {
    throw new Error('La población de 15 a 64 años debe ser mayor a cero');
  }
  return ((poblacion0a14 + poblacion65Mas) / poblacion15a64) * 100;
}

/**
 * Índice de envejecimiento (RF-02-03): personas de 65+ por cada 100 menores de 15.
 */
export function calcularIndiceEnvejecimiento(poblacion65Mas: number, poblacion0a14: number): number {
  if (poblacion0a14 <= 0) {
    throw new Error('La población de 0 a 14 años debe ser mayor a cero');
  }
  return (poblacion65Mas / poblacion0a14) * 100;
}

/**
 * Tasa por mil (RF-02-03: natalidad/mortalidad "aparente" a partir de
 * altas/bajas del periodo). Genérica: se usa tanto para altas como para
 * defunciones sobre la misma población base.
 */
export function calcularTasaPorMil(eventos: number, poblacionBase: number): number {
  if (poblacionBase <= 0) {
    throw new Error('La población base debe ser mayor a cero');
  }
  return (eventos / poblacionBase) * 1000;
}
