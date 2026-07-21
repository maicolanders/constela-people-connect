import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HabitanteAuthTokenStore } from './habitante-auth-token-store';

export interface RegistroHabitanteRequest {
  tipoDocumentoId: number;
  numeroDocumento: string;
  fechaNacimiento: string;
  passwordNueva: string;
}

export interface LoginHabitanteRequest {
  tipoDocumentoId: number;
  numeroDocumento: string;
  password: string;
}

export interface MiPerfilHabitante {
  habitanteId: number;
  nombres: string;
  apellidos: string;
  sexo: string;
  fechaNacimiento: string;
  numeroDocumento: string | null;
  tipoDocumentoId: number | null;
  hogarId: number;
  comunidadId: number;
  telefono: string | null;
  correoElectronico: string | null;
  direccionReferencia: string | null;
}

interface ParDeTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Cliente del portal de autogestión del habitante (Fase 14) — paralelo a
 * `AuthService` (staff), pero contra `/api/poblacion/habitantes/auth/*` y
 * guardando en `HabitanteAuthTokenStore` (claves de localStorage distintas).
 */
@Injectable({ providedIn: 'root' })
export class HabitanteAuthService {
  constructor(
    private readonly http: HttpClient,
    private readonly tokenStore: HabitanteAuthTokenStore,
  ) {}

  registrar(dto: RegistroHabitanteRequest): Promise<{ habitanteId: number }> {
    return firstValueFrom(this.http.post<{ habitanteId: number }>('/api/poblacion/habitantes/auth/registro', dto));
  }

  async iniciarSesion(dto: LoginHabitanteRequest): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<ParDeTokens>('/api/poblacion/habitantes/auth/login', dto),
    );
    this.tokenStore.guardarTokens(tokens.accessToken, tokens.refreshToken);
  }

  async refrescarSesion(): Promise<void> {
    const refreshToken = this.tokenStore.obtenerRefreshToken();
    if (!refreshToken) {
      throw new Error('No hay refresh token de habitante disponible');
    }
    const tokens = await firstValueFrom(
      this.http.post<ParDeTokens>('/api/poblacion/habitantes/auth/refrescar', { refreshToken }),
    );
    this.tokenStore.guardarTokens(tokens.accessToken, tokens.refreshToken);
  }

  obtenerMiPerfil(): Promise<MiPerfilHabitante> {
    return firstValueFrom(this.http.get<MiPerfilHabitante>('/api/poblacion/habitantes/mi-perfil'));
  }

  cerrarSesion(): void {
    this.tokenStore.limpiar();
  }
}
