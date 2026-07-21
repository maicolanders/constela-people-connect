import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthTokenStore, HabitanteAuthTokenStore } from '@censo/web-shared-data-access';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor (Fase 14: enruta el token correcto según el prefijo de la URL)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokenStore: AuthTokenStore;
  let habitanteTokenStore: HabitanteAuthTokenStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(), provideRouter([])],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStore = TestBed.inject(AuthTokenStore);
    habitanteTokenStore = TestBed.inject(HabitanteAuthTokenStore);
  });

  afterEach(() => {
    httpMock.verify();
    tokenStore.limpiar();
    habitanteTokenStore.limpiar();
  });

  it('adjunta el token de staff a una ruta que no es de autogestión', () => {
    tokenStore.guardarTokens('token-staff', 'refresh-staff');
    habitanteTokenStore.guardarTokens('token-habitante', 'refresh-habitante');

    http.get('/api/poblacion/habitantes').subscribe();

    const solicitud = httpMock.expectOne('/api/poblacion/habitantes');
    expect(solicitud.request.headers.get('Authorization')).toBe('Bearer token-staff');
    solicitud.flush({});
  });

  it('adjunta el token de habitante a una ruta "mi-*" de autogestión', () => {
    tokenStore.guardarTokens('token-staff', 'refresh-staff');
    habitanteTokenStore.guardarTokens('token-habitante', 'refresh-habitante');

    http.get('/api/poblacion/habitantes/mi-perfil').subscribe();

    const solicitud = httpMock.expectOne('/api/poblacion/habitantes/mi-perfil');
    expect(solicitud.request.headers.get('Authorization')).toBe('Bearer token-habitante');
    solicitud.flush({});
  });

  it('no adjunta ningún token a la ruta pública de login de habitante', () => {
    habitanteTokenStore.guardarTokens('token-habitante', 'refresh-habitante');

    http.post('/api/poblacion/habitantes/auth/login', {}).subscribe();

    const solicitud = httpMock.expectOne('/api/poblacion/habitantes/auth/login');
    expect(solicitud.request.headers.has('Authorization')).toBe(false);
    solicitud.flush({});
  });

  it('no toca peticiones fuera de /api', () => {
    http.get('/assets/config.json').subscribe();

    const solicitud = httpMock.expectOne('/assets/config.json');
    expect(solicitud.request.headers.has('Authorization')).toBe(false);
    solicitud.flush({});
  });
});
