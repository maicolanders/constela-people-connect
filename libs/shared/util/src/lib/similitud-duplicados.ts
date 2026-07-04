/**
 * Scoring de similitud para detección de duplicados de habitantes (RF-01-05).
 * Se usa tanto en el backend (autoridad) como en el frontend (preview offline
 * contra la caché local de la comunidad) para poder alertar sin conexión.
 */
export interface DatosComparablesHabitante {
  nombres: string;
  apellidos: string;
  fechaNacimiento: Date | null;
  comunidadId: number;
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const columnas = b.length + 1;
  const matriz: number[][] = Array.from({ length: filas }, () => new Array<number>(columnas).fill(0));

  for (let i = 0; i < filas; i++) matriz[i][0] = i;
  for (let j = 0; j < columnas; j++) matriz[0][j] = j;

  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < columnas; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(matriz[i - 1][j] + 1, matriz[i][j - 1] + 1, matriz[i - 1][j - 1] + costo);
    }
  }

  return matriz[filas - 1][columnas - 1];
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function similitudTexto(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (na.length === 0 && nb.length === 0) return 1;
  const distancia = distanciaLevenshtein(na, nb);
  const maxLongitud = Math.max(na.length, nb.length);
  return maxLongitud === 0 ? 1 : 1 - distancia / maxLongitud;
}

function mismaFecha(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Retorna un score 0..1 de qué tan probable es que dos registros sean la
 * misma persona. Solo compara dentro de la misma comunidad (RF-01-01:
 * duplicado se valida dentro de la misma comunidad).
 */
export function calcularSimilitudHabitante(a: DatosComparablesHabitante, b: DatosComparablesHabitante): number {
  if (a.comunidadId !== b.comunidadId) {
    return 0;
  }

  const scoreNombres = similitudTexto(a.nombres, b.nombres);
  const scoreApellidos = similitudTexto(a.apellidos, b.apellidos);
  const scoreFecha = mismaFecha(a.fechaNacimiento, b.fechaNacimiento) ? 1 : 0;

  return scoreNombres * 0.4 + scoreApellidos * 0.4 + scoreFecha * 0.2;
}

export const UMBRAL_POSIBLE_DUPLICADO = 0.75;

export function esPosibleDuplicado(a: DatosComparablesHabitante, b: DatosComparablesHabitante): boolean {
  return calcularSimilitudHabitante(a, b) >= UMBRAL_POSIBLE_DUPLICADO;
}
