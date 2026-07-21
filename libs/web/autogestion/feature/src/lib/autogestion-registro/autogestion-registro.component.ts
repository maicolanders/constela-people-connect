import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HabitanteAuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { CatalogoItemApi } from '../autogestion-login/autogestion-login.component';

/**
 * Fase 14: autoregistro validando contra el censo — documento + fecha de
 * nacimiento (2do factor, evita reclamar la identidad de otra persona solo
 * con el número de documento) + contraseña nueva. Solo mayores de edad
 * (verificado server-side).
 */
@Component({
  selector: 'app-autogestion-registro',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './autogestion-registro.component.html',
})
export class AutogestionRegistroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly habitanteAuthService = inject(HabitanteAuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly exito = signal(false);
  readonly tiposDocumento = signal<CatalogoItemApi[]>([]);

  readonly formulario = this.fb.nonNullable.group({
    tipoDocumentoId: this.fb.control<number | null>(null, Validators.required),
    numeroDocumento: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
  });

  async ngOnInit(): Promise<void> {
    this.tiposDocumento.set(
      await firstValueFrom(this.http.get<CatalogoItemApi[]>('/api/catalogos/tipo_documento/items')).catch(() => []),
    );
  }

  async enviar(): Promise<void> {
    if (this.formulario.invalid || this.enviando()) {
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    const { tipoDocumentoId, numeroDocumento, fechaNacimiento, passwordNueva } = this.formulario.getRawValue();

    try {
      await this.habitanteAuthService.registrar({
        tipoDocumentoId: tipoDocumentoId as number,
        numeroDocumento,
        fechaNacimiento,
        passwordNueva,
      });
      this.exito.set(true);
      setTimeout(() => void this.router.navigate(['/autogestion/login']), 2000);
    } catch (error) {
      this.error.set(this.mensajeError(error));
    } finally {
      this.enviando.set(false);
    }
  }

  private mensajeError(error: unknown): string {
    const status = (error as { status?: number })?.status;
    if (status === 403) return 'autogestion.registroErrorMenorEdad';
    if (status === 409) return 'autogestion.registroErrorDuplicado';
    return 'autogestion.registroErrorGenerico';
  }
}
