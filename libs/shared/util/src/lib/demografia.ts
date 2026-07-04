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
