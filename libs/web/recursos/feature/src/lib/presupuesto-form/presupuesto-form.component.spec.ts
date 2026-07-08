import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { PresupuestoFormComponent } from './presupuesto-form.component';

const ACTIVATED_ROUTE_STUB = { snapshot: { paramMap: convertToParamMap({}) } };
const COMUNIDAD_GUAMBIANO = { id: 4, nombre: 'Guambiano' };
const PERIODO_1 = { id: 1, nombre: 'Periodo 2026' };

function crearComponente(presupuestosExistentes: unknown[] = []) {
  const http = {
    get: jest.fn().mockImplementation((url: string) => {
      if (url === '/api/comunidades') return of([COMUNIDAD_GUAMBIANO]);
      if (url === '/api/periodos-censales') return of([PERIODO_1]);
      if (url === '/api/recursos/presupuestos') return of(presupuestosExistentes);
      return of(null);
    }),
    post: jest.fn().mockReturnValue(of({ id: 99, comunidadId: 4, periodoCensalId: 1, monto: '1000.00', observaciones: null })),
    patch: jest.fn().mockReturnValue(of({})),
  };

  TestBed.configureTestingModule({
    providers: [
      provideTranslateService(),
      { provide: HttpClient, useValue: http },
      { provide: ActivatedRoute, useValue: ACTIVATED_ROUTE_STUB },
    ],
  });

  const fixture = TestBed.createComponent(PresupuestoFormComponent);
  return { componente: fixture.componentInstance, http };
}

describe('PresupuestoFormComponent', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('no guarda si falta comunidad/periodo/monto (formulario inválido)', async () => {
    const { componente, http } = crearComponente();
    await componente.ngOnInit();

    await componente.guardar();

    expect(http.post).not.toHaveBeenCalled();
  });

  it('al elegir comunidad+periodo sin presupuesto existente, crea uno nuevo (POST)', async () => {
    const { componente, http } = crearComponente([]);
    await componente.ngOnInit();

    componente.formulario.patchValue({ comunidadId: 4, periodoCensalId: 1 });
    await componente.onComunidadOPeriodoChange();
    componente.formulario.patchValue({ monto: 5000000 });

    await componente.guardar();

    expect(http.post).toHaveBeenCalledWith(
      '/api/recursos/presupuestos',
      expect.objectContaining({ comunidadId: 4, periodoCensalId: 1, monto: 5000000 }),
    );
    expect(componente.guardadoExitoso()).toBe(true);
  });

  it('al elegir comunidad+periodo con presupuesto existente, precarga el monto y actualiza (PATCH) en vez de crear', async () => {
    const { componente, http } = crearComponente([
      { id: 7, comunidadId: 4, periodoCensalId: 1, monto: '3000000.00', observaciones: 'Nota previa' },
    ]);
    await componente.ngOnInit();

    componente.formulario.patchValue({ comunidadId: 4, periodoCensalId: 1 });
    await componente.onComunidadOPeriodoChange();

    expect(componente.formulario.value.monto).toBe(3000000);

    componente.formulario.patchValue({ monto: 3500000 });
    await componente.guardar();

    expect(http.patch).toHaveBeenCalledWith('/api/recursos/presupuestos/7', expect.objectContaining({ monto: 3500000 }));
    expect(http.post).not.toHaveBeenCalled();
  });

  it('muestra error si falla el guardado', async () => {
    const { componente, http } = crearComponente([]);
    http.post.mockReturnValue(throwError(() => new Error('fallo')));
    await componente.ngOnInit();

    componente.formulario.patchValue({ comunidadId: 4, periodoCensalId: 1, monto: 1000 });
    await componente.guardar();

    expect(componente.error()).toBe('recursos.errorGuardarPresupuesto');
  });
});
