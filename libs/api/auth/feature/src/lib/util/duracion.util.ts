const MULTIPLICADORES_SEGUNDOS: Record<string, number> = { s: 1, m: 60, h: 3_600, d: 86_400 };

/**
 * Convierte expresiones cortas tipo "15m"/"7d" a segundos. Se usa en vez de
 * pasar el string directo a jsonwebtoken: sus tipos (`StringValue` de la
 * librería `ms`) son un literal-union que no acepta un `string` genérico
 * proveniente de ConfigService, mientras que un `number` sí es válido.
 */
export function segundosDesdeExpresion(expresion: string): number {
  const coincidencia = /^(\d+)([smhd])$/.exec(expresion);
  if (!coincidencia) {
    throw new Error(`Formato de expiración inválido: ${expresion}`);
  }
  return Number(coincidencia[1]) * MULTIPLICADORES_SEGUNDOS[coincidencia[2]];
}

export function fechaExpiracionDesde(expresion: string): Date {
  return new Date(Date.now() + segundosDesdeExpresion(expresion) * 1000);
}
