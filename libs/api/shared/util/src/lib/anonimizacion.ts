/**
 * Regla de anonimización mínima (RT-05) para reportes/exportes agregados:
 * cualquier fila cuyo total sea menor al umbral de k-anonimity se suprime
 * (se oculta el valor exacto) para evitar identificación indirecta de
 * individuos en comunidades pequeñas.
 */
export interface FilaReporteAgregado {
  total: number;
  [clave: string]: unknown;
}

export interface FilaReporteAnonimizada {
  total: number | null;
  suprimido: boolean;
  [clave: string]: unknown;
}

export interface OpcionesAnonimizacion {
  /** Tamaño mínimo de grupo permitido para publicar el valor exacto. */
  umbralMinimo?: number;
}

const UMBRAL_MINIMO_POR_DEFECTO = 5;

export function aplicarAnonimizacionKAnonimity<T extends FilaReporteAgregado>(
  filas: T[],
  opciones: OpcionesAnonimizacion = {},
): FilaReporteAnonimizada[] {
  const umbral = opciones.umbralMinimo ?? UMBRAL_MINIMO_POR_DEFECTO;

  return filas.map((fila) => {
    const suprimido = fila.total > 0 && fila.total < umbral;
    return {
      ...fila,
      total: suprimido ? null : fila.total,
      suprimido,
    };
  });
}
