import { generarCsv } from './csv.util';

describe('generarCsv', () => {
  it('genera encabezado y una fila con las columnas del primer objeto', () => {
    const csv = generarCsv([{ grupoQuinquenal: '0-4', sexo: 'M', total: 5 }]);
    expect(csv).toBe('grupoQuinquenal,sexo,total\n0-4,M,5');
  });

  it('genera varias filas en el mismo orden de columnas', () => {
    const csv = generarCsv([
      { grupo: '0-4', total: 5 },
      { grupo: '5-9', total: 3 },
    ]);
    expect(csv).toBe('grupo,total\n0-4,5\n5-9,3');
  });

  it('representa null/undefined como celda vacía', () => {
    const csv = generarCsv([{ total: null, suprimido: true }]);
    expect(csv).toBe('total,suprimido\n,true');
  });

  it('escapa valores con comas o comillas', () => {
    const csv = generarCsv([{ nombre: 'Pérez, Ana "La Jefa"' }]);
    expect(csv).toBe('nombre\n"Pérez, Ana ""La Jefa"""');
  });

  it('retorna cadena vacía si no hay filas', () => {
    expect(generarCsv([])).toBe('');
  });
});
