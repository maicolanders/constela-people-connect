import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { CampoSensible } from '@censo/api-shared-data-access';
import { RolCodigo } from '@censo/shared-data-access';
import { SensitiveFieldsInterceptor } from './sensitive-fields.interceptor';

class HabitanteDePrueba {
  nombres = 'Ana';

  @CampoSensible({ categoria: 'documento-identidad', rolesPermitidos: [RolCodigo.CENSISTA, RolCodigo.LIDER_COMUNITARIO] })
  numeroDocumento = '123456';

  @CampoSensible({ categoria: 'etnia' })
  etnia = 'Wayuu';
}

function crearContexto(roles?: string[]): ExecutionContext {
  const request = { user: roles ? { roles } : undefined };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function crearHandler(data: unknown): CallHandler {
  return { handle: () => of(data) };
}

describe('SensitiveFieldsInterceptor', () => {
  const interceptor = new SensitiveFieldsInterceptor();

  function interceptar(roles: string[] | undefined, data: unknown): Promise<unknown> {
    return new Promise((resolve) => {
      interceptor.intercept(crearContexto(roles), crearHandler(data)).subscribe((resultado) => resolve(resultado));
    });
  }

  it('administrador ve todos los campos sensibles', async () => {
    const resultado = (await interceptar([RolCodigo.ADMINISTRADOR], new HabitanteDePrueba())) as HabitanteDePrueba;
    expect(resultado.numeroDocumento).toBe('123456');
    expect(resultado.etnia).toBe('Wayuu');
  });

  it('censista ve numeroDocumento (rolesPermitidos) pero no etnia (sin rolesPermitidos)', async () => {
    const resultado = (await interceptar([RolCodigo.CENSISTA], new HabitanteDePrueba())) as HabitanteDePrueba;
    expect(resultado.numeroDocumento).toBe('123456');
    expect(resultado.etnia).toBeUndefined();
  });

  it('lider_comunitario ve numeroDocumento (rolesPermitidos)', async () => {
    const resultado = (await interceptar([RolCodigo.LIDER_COMUNITARIO], new HabitanteDePrueba())) as HabitanteDePrueba;
    expect(resultado.numeroDocumento).toBe('123456');
  });

  it('analista no ve ningún campo sensible', async () => {
    const resultado = (await interceptar([RolCodigo.ANALISTA], new HabitanteDePrueba())) as HabitanteDePrueba;
    expect(resultado.numeroDocumento).toBeUndefined();
    expect(resultado.etnia).toBeUndefined();
  });

  it('redacta también en listas', async () => {
    const resultado = (await interceptar([RolCodigo.ANALISTA], [new HabitanteDePrueba()])) as HabitanteDePrueba[];
    expect(resultado[0].numeroDocumento).toBeUndefined();
  });

  it('no toca datos primitivos o sin metadata sensible', async () => {
    expect(await interceptar([RolCodigo.ANALISTA], { nombre: 'x' })).toEqual({ nombre: 'x' });
    expect(await interceptar(undefined, 42)).toBe(42);
  });
});
