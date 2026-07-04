import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthTokenStore } from './auth-token-store';

export interface AsignacionRolUsuario {
  rol: string;
  comunidadId: number | null;
}

export interface UsuarioAutenticado {
  id: number;
  email: string;
  roles: string[];
  asignaciones: AsignacionRolUsuario[];
}

interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

/** Cliente del módulo de auth del backend (login/refresh/me) + persistencia de tokens. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenStore: AuthTokenStore,
  ) {}

  async iniciarSesion(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(this.http.post<ParDeTokens>('/api/auth/login', { email, password }));
    this.tokenStore.guardarTokens(tokens.accessToken, tokens.refreshToken);
  }

  async refrescarSesion(): Promise<void> {
    const refreshToken = this.tokenStore.obtenerRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }
    const tokens = await firstValueFrom(this.http.post<ParDeTokens>('/api/auth/refresh', { refreshToken }));
    this.tokenStore.guardarTokens(tokens.accessToken, tokens.refreshToken);
  }

  obtenerPerfil(): Promise<UsuarioAutenticado> {
    return firstValueFrom(this.http.get<UsuarioAutenticado>('/api/auth/me'));
  }

  cerrarSesion(): void {
    this.tokenStore.limpiar();
  }
}
