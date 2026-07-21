import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HabitanteAuthService, MiPerfilHabitante } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

/**
 * Fase 14 (autogestión): edición del propio contacto — dirección de
 * referencia, teléfono, correo electrónico. Alcance deliberadamente acotado
 * a contacto (decisión de producto): las coordenadas GPS del hogar
 * (`HogarUbicacion`) NO se tocan aquí, siguen siendo responsabilidad del
 * censista.
 */
@Component({
  selector: 'app-mi-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './mi-perfil.component.html',
})
export class MiPerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly habitanteAuthService = inject(HabitanteAuthService);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);
  readonly guardadoExitoso = signal(false);
  readonly perfil = signal<MiPerfilHabitante | null>(null);

  readonly formulario = this.fb.nonNullable.group({
    telefono: [''],
    correoElectronico: ['', Validators.email],
    direccionReferencia: [''],
  });

  async ngOnInit(): Promise<void> {
    try {
      const perfil = await this.habitanteAuthService.obtenerMiPerfil();
      this.perfil.set(perfil);
      this.formulario.patchValue({
        telefono: perfil.telefono ?? '',
        correoElectronico: perfil.correoElectronico ?? '',
        direccionReferencia: perfil.direccionReferencia ?? '',
      });
    } catch {
      this.error.set('autogestion.errorCargarMiPerfil');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid || this.guardando()) {
      return;
    }

    this.guardando.set(true);
    this.error.set(null);
    this.guardadoExitoso.set(false);
    const { telefono, correoElectronico, direccionReferencia } = this.formulario.getRawValue();

    try {
      const perfil = await firstValueFrom(
        this.http.patch<MiPerfilHabitante>('/api/poblacion/habitantes/mi-contacto', {
          telefono: telefono || null,
          correoElectronico: correoElectronico || null,
          direccionReferencia: direccionReferencia || null,
        }),
      );
      this.perfil.set(perfil);
      this.guardadoExitoso.set(true);
    } catch {
      this.error.set('autogestion.errorGuardarMiPerfil');
    } finally {
      this.guardando.set(false);
    }
  }
}
