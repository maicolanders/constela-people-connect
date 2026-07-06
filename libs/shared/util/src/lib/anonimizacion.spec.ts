import { aplicarAnonimizacionKAnonimity } from './anonimizacion';

describe('aplicarAnonimizacionKAnonimity', () => {
  it('mantiene el total exacto cuando es mayor o igual al umbral', () => {
    const [fila] = aplicarAnonimizacionKAnonimity([{ total: 5 }]);
    expect(fila).toEqual({ total: 5, suprimido: false });
  });

  it('suprime el total cuando está entre 1 y el umbral (exclusivo)', () => {
    const [fila] = aplicarAnonimizacionKAnonimity([{ total: 3 }]);
    expect(fila).toEqual({ total: null, suprimido: true });
  });

  it('no suprime un total en cero (no hay nadie que identificar)', () => {
    const [fila] = aplicarAnonimizacionKAnonimity([{ total: 0 }]);
    expect(fila).toEqual({ total: 0, suprimido: false });
  });

  it('respeta un umbral personalizado', () => {
    const [fila] = aplicarAnonimizacionKAnonimity([{ total: 8 }], { umbralMinimo: 10 });
    expect(fila.suprimido).toBe(true);
  });

  it('preserva las demás propiedades de la fila', () => {
    const [fila] = aplicarAnonimizacionKAnonimity([{ total: 2, grupoQuinquenal: '0-4', sexo: 'F' }]);
    expect(fila['grupoQuinquenal']).toBe('0-4');
    expect(fila['sexo']).toBe('F');
  });
});
