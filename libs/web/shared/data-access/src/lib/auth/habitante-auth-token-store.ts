import { Injectable, computed, signal } from '@angular/core';

const CLAVE_ACCESS_TOKEN = 'censo.habitante.accessToken';
const CLAVE_REFRESH_TOKEN = 'censo.habitante.refreshToken';

/**
 * Fase 14 (autogestión): store paralelo al de staff (`AuthTokenStore`), con
 * claves de localStorage DISTINTAS a propósito — un habitante y un miembro
 * del staff son sesiones conceptualmente distintas que pueden coexistir en
 * el mismo navegador (p.ej. un líder comunitario probando su propio portal
 * de autogestión) sin que iniciar sesión en una cierre la otra.
 */
@Injectable({ providedIn: 'root' })
export class HabitanteAuthTokenStore {
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
