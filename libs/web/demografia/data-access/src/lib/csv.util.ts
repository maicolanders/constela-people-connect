/** Exportación "como datos" (RF-02-02), mismo formato que el backend (libs/api/demografia/feature). */
export function generarCsv(filas: Array<Record<string, unknown>>): string {
  if (filas.length === 0) {
    return '';
  }
  const columnas = Object.keys(filas[0]);
  const encabezado = columnas.join(',');
  const cuerpo = filas.map((fila) => columnas.map((columna) => escaparValorCsv(fila[columna])).join(',')).join('\n');
  return `${encabezado}\n${cuerpo}`;
}

function escaparValorCsv(valor: unknown): string {
  const texto = valor === null || valor === undefined ? '' : String(valor);
  if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}
