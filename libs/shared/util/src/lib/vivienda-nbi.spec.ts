import { calcularNbi } from './vivienda-nbi';

const datosAdecuados = {
  habitantesActivos: 2,
  numeroDormitorios: 2,
  tipoViviendaCodigo: 'casa',
  materialParedCodigo: 'bloque_ladrillo',
  materialPisoCodigo: 'cemento',
  aguaPotableAdecuada: true,
  saneamientoAdecuado: true,
};

describe('calcularNbi', () => {
  it('calcula el hacinamiento (habitantes/dormitorios) sin marcarlo crítico si es <= 3', () => {
    const resultado = calcularNbi({ ...datosAdecuados, habitantesActivos: 6, numeroDormitorios: 2 });

    expect(resultado.hacinamiento).toBe(3);
    expect(resultado.hacinamientoCritico).toBe(false);
  });

  it('marca hacinamiento crítico si supera 3 habitantes por dormitorio', () => {
    const resultado = calcularNbi({ ...datosAdecuados, habitantesActivos: 7, numeroDormitorios: 2 });

    expect(resultado.hacinamientoCritico).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('marca vivienda inadecuada si el tipo o material predominante lo indica', () => {
    const resultado = calcularNbi({ ...datosAdecuados, tipoViviendaCodigo: 'choza_rancho' });

    expect(resultado.viviendaInadecuada).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('marca servicios inadecuados si falta acueducto o saneamiento adecuado', () => {
    const resultado = calcularNbi({ ...datosAdecuados, aguaPotableAdecuada: false });

    expect(resultado.serviciosInadecuados).toBe(true);
    expect(resultado.tieneNbi).toBe(true);
  });

  it('sin ningún componente insatisfecho, tieneNbi es false', () => {
    const resultado = calcularNbi(datosAdecuados);

    expect(resultado).toEqual(
      expect.objectContaining({ hacinamientoCritico: false, viviendaInadecuada: false, serviciosInadecuados: false, tieneNbi: false }),
    );
  });
});
