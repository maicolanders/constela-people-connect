import { calcularHacinamiento } from './demografia';

/** Umbral estándar DANE de hacinamiento crítico: más de 3 personas por dormitorio. */
export const UMBRAL_HACINAMIENTO_CRITICO = 3;

export const CODIGOS_VIVIENDA_INADECUADA = ['choza_rancho'];
export const CODIGOS_MATERIAL_INADECUADO = ['material_natural', 'tierra'];

export interface DatosNbiVivienda {
  habitantesActivos: number;
  numeroDormitorios: number;
  tipoViviendaCodigo?: string | null;
  materialParedCodigo?: string | null;
  materialPisoCodigo?: string | null;
  aguaPotableAdecuada: boolean;
  saneamientoAdecuado: boolean;
}

export interface ResultadoNbi {
  hacinamiento: number;
  hacinamientoCritico: boolean;
  viviendaInadecuada: boolean;
  serviciosInadecuados: boolean;
  tieneNbi: boolean;
}

/**
 * NBI simplificado (3 de los 5 componentes DANE clásicos: hacinamiento
 * crítico, vivienda inadecuada, servicios inadecuados — ver nota en
 * `HacinamientoNbiService`, Fase 4). Extraído a `shared/util` en Fase 9 para
 * que `IndicadoresRecursosService` (que no puede depender de `domain:vivienda`,
 * ver eslint.config.mjs) reutilice exactamente la misma fórmula al agregar
 * por comunidad, en vez de reimplementarla y arriesgar que ambas diverjan.
 */
export function calcularNbi(datos: DatosNbiVivienda): ResultadoNbi {
  const hacinamiento = calcularHacinamiento(
    datos.habitantesActivos,
    datos.numeroDormitorios,
  );
  const hacinamientoCritico = hacinamiento > UMBRAL_HACINAMIENTO_CRITICO;

  const viviendaInadecuada =
    CODIGOS_VIVIENDA_INADECUADA.includes(datos.tipoViviendaCodigo ?? '') ||
    CODIGOS_MATERIAL_INADECUADO.includes(datos.materialParedCodigo ?? '') ||
    CODIGOS_MATERIAL_INADECUADO.includes(datos.materialPisoCodigo ?? '');

  const serviciosInadecuados =
    !datos.aguaPotableAdecuada || !datos.saneamientoAdecuado;

  return {
    hacinamiento,
    hacinamientoCritico,
    viviendaInadecuada,
    serviciosInadecuados,
    tieneNbi: hacinamientoCritico || viviendaInadecuada || serviciosInadecuados,
  };
}
