import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HabitanteAuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export interface CatalogoItemApi {
  id: number;
  codigo: string;
  nombre: string;
}

/** Fase 14: login del portal de autogestión — por documento (no email, a diferencia del staff). */
@Component({
  selector: 'app-autogestion-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, RouterLink],
  templateUrl: './autogestion-login.component.html',
})
export class AutogestionLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly habitanteAuthService = inject(HabitanteAuthService);
  private readonly router = inject(Router);

  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly tiposDocumento = signal<CatalogoItemApi[]>([]);

  readonly formulario = this.fb.nonNullable.group({
    tipoDocumentoId: this.fb.control<number | null>(null, Validators.required),
    numeroDocumento: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(8)]],
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
    const { tipoDocumentoId, numeroDocumento, password } = this.formulario.getRawValue();

    try {
      await this.habitanteAuthService.iniciarSesion({ tipoDocumentoId: tipoDocumentoId as number, numeroDocumento, password });
      await this.router.navigate(['/autogestion/mi-hogar']);
    } catch {
      this.error.set('autogestion.loginError');
    } finally {
      this.enviando.set(false);
    }
  }
}
