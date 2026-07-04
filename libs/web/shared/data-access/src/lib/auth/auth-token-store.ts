import { Injectable, computed, signal } from '@angular/core';

const CLAVE_ACCESS_TOKEN = 'censo.accessToken';
const CLAVE_REFRESH_TOKEN = 'censo.refreshToken';

/**
 * Almacena los tokens JWT en localStorage (no en memoria únicamente) para que
 * la sesión sobreviva recargas y quede disponible incluso sin conexión, algo
 * necesario en una PWA de campo. Se acepta el trade-off frente a cookies
 * httpOnly (más resistentes a XSS) porque el dispositivo suele ser controlado
 * por el propio censista durante el trabajo de campo.
 */
@Injectable({ providedIn: 'root' })
export class AuthTokenStore {
  private readonly accessTokenSignal = signal<string | null>(this.leer(CLAVE_ACCESS_TOKEN));
  private readonly refreshTokenSignal = signal<string | null>(this.leer(CLAVE_REFRESH_TOKEN));

  readonly autenticado = computed(() => this.accessTokenSignal() !== null);

  obtenerAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  obtenerRefreshToken(): string | null {
    return this.refreshTokenSignal();
  }

  guardarTokens(accessToken: string, refreshToken: string): void {
    this.accessTokenSignal.set(accessToken);
    this.refreshTokenSignal.set(refreshToken);
    this.escribir(CLAVE_ACCESS_TOKEN, accessToken);
    this.escribir(CLAVE_REFRESH_TOKEN, refreshToken);
  }

  limpiar(): void {
    this.accessTokenSignal.set(null);
    this.refreshTokenSignal.set(null);
    this.remover(CLAVE_ACCESS_TOKEN);
    this.remover(CLAVE_REFRESH_TOKEN);
  }

  private leer(clave: string): string | null {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(clave);
  }

  private escribir(clave: string, valor: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(clave, valor);
    }
  }

  private remover(clave: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(clave);
    }
  }
}
