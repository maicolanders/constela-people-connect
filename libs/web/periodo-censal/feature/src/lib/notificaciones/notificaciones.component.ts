import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

export interface NotificacionApi {
  id: number;
  tipo: string;
  mensaje: string;
  fechaProgramada: string;
  leidaEn: string | null;
}

/**
 * RF-10-03: recordatorios in-app (sin envío de correo real, ver
 * `NotificacionesService` en el backend). El administrador además puede
 * programar nuevos recordatorios y disparar manualmente la activación de
 * los que ya están próximos (no hay scheduler/cron en el backend).
 */
@Component({
  selector: 'app-notificaciones',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly notificaciones = signal<NotificacionApi[]>([]);
  readonly esAdministrador = signal(false);
  readonly guardando = signal(false);
  readonly mensajeAdmin = signal<string | null>(null);
  readonly recordatoriosActivados = signal<number | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    tipo: ['actualizacion_programada', [Validators.required, Validators.maxLength(50)]],
    mensaje: ['', [Validators.required, Validators.maxLength(500)]],
    fechaProgramada: ['', Validators.required],
    comunidadId: [null as number | null],
  });

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.esAdministrador.set(usuario.roles.includes('administrador'));
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.notificaciones.set(await firstValueFrom(this.http.get<NotificacionApi[]>('/api/notificaciones')));
    } catch {
      this.error.set('periodoCensal.errorCargarNotificaciones');
    } finally {
      this.cargando.set(false);
    }
  }

  async marcarLeida(id: number): Promise<void> {
    await firstValueFrom(this.http.patch(`/api/notificaciones/${id}/leida`, {}));
    await this.recargar();
  }

  async programar(): Promise<void> {
    if (this.formulario.invalid) {
      return;
    }
    this.guardando.set(true);
    this.mensajeAdmin.set(null);
    try {
      const valores = this.formulario.getRawValue();
      await firstValueFrom(
        this.http.post('/api/notificaciones', {
          tipo: valores.tipo,
          mensaje: valores.mensaje,
          fechaProgramada: valores.fechaProgramada,
          ...(valores.comunidadId ? { comunidadId: valores.comunidadId } : {}),
        }),
      );
      this.formulario.reset({ tipo: 'actualizacion_programada', mensaje: '', fechaProgramada: '', comunidadId: null });
      this.mensajeAdmin.set('periodoCensal.notificacionProgramada');
    } catch {
      this.mensajeAdmin.set('periodoCensal.errorProgramarNotificacion');
    } finally {
      this.guardando.set(false);
    }
  }

  async generarRecordatorios(): Promise<void> {
    this.guardando.set(true);
    this.recordatoriosActivados.set(null);
    try {
      const resultado = await firstValueFrom(
        this.http.post<{ activadas: number }>('/api/notificaciones/generar-recordatorios', {}),
      );
      this.recordatoriosActivados.set(resultado.activadas);
      await this.recargar();
    } finally {
      this.guardando.set(false);
    }
  }
}
