import { RolCodigo } from '@censo/shared-data-access';
import { comunidadesPermitidas, tieneAccesoComunidad } from './comunidad-acceso.util';

describe('comunidad-acceso.util', () => {
  it('devuelve "global" si alguna asignación aplicable tiene comunidadId null', () => {
    const resultado = comunidadesPermitidas([{ rol: RolCodigo.ANALISTA, comunidadId: null }]);
    expect(resultado).toBe('global');
  });

  it('devuelve la lista de comunidades asignadas cuando no hay asignación global', () => {
    const resultado = comunidadesPermitidas([
      { rol: RolCodigo.CENSISTA, comunidadId: 5 },
      { rol: RolCodigo.CENSISTA, comunidadId: 8 },
    ]);
    expect(resultado).toEqual([5, 8]);
  });

  it('filtra por roles requeridos antes de decidir', () => {
    const resultado = comunidadesPermitidas(
      [
        { rol: RolCodigo.ANALISTA, comunidadId: null },
        { rol: RolCodigo.CENSISTA, comunidadId: 5 },
      ],
      [RolCodigo.CENSISTA],
    );
    expect(resultado).toEqual([5]);
  });

  it('tieneAccesoComunidad autoriza si la comunidad está en la lista permitida', () => {
    expect(tieneAccesoComunidad([{ rol: RolCodigo.CENSISTA, comunidadId: 5 }], 5)).toBe(true);
  });

  it('tieneAccesoComunidad rechaza si la comunidad no está en la lista permitida', () => {
    expect(tieneAccesoComunidad([{ rol: RolCodigo.CENSISTA, comunidadId: 5 }], 9)).toBe(false);
  });
});
