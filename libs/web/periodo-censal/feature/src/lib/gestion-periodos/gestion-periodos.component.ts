import { HttpClient } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

export interface PeriodoCensalApi {
  id: number;
  nombre: string;
  codigo: string;
  fechaInicio: string;
  fechaCierre: string | null;
  estado: 'planeado' | 'abierto' | 'cerrado';
  periodoOrigenId: number | null;
}

/**
 * RF-10-01: gestión de periodos censales — crear, abrir, cerrar, e "iniciar
 * un nuevo periodo partiendo de la base poblacional vigente" (criterio 2) a
 * partir de uno ya cerrado. Pantalla de administrador (trabajo de oficina,
 * sin captura de campo): sin outbox offline, igual que Fase 9.
 */
@Component({
  selector: 'app-gestion-periodos',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './gestion-periodos.component.html',
})
export class GestionPeriodosComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);
  readonly periodos = signal<PeriodoCensalApi[]>([]);
  readonly esAdministrador = signal(false);
  readonly periodoOrigenId = signal<number | null>(null);

  readonly formulario = this.formBuilder.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    codigo: ['', [Validators.required, Validators.maxLength(30)]],
    fechaInicio: ['', Validators.required],
  });

  readonly tituloFormulario = computed(() =>
    this.periodoOrigenId() !== null ? 'periodoCensal.iniciarNuevoPeriodo' : 'periodoCensal.crearPeriodo',
  );

  async ngOnInit(): Promise<void> {
    const usuario = await this.authService.obtenerPerfil();
    this.esAdministrador.set(usuario.roles.includes('administrador'));
    await this.recargar();
  }

  async recargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.periodos.set(await firstValueFrom(this.http.get<PeriodoCensalApi[]>('/api/periodos-censales')));
    } catch {
      this.error.set('periodoCensal.errorCargar');
    } finally {
      this.cargando.set(false);
    }
  }

  prepararIniciarNuevo(origenId: number): void {
    this.periodoOrigenId.set(origenId);
    this.formulario.reset({ nombre: '', codigo: '', fechaInicio: '' });
  }

  cancelarIniciarNuevo(): void {
    this.periodoOrigenId.set(null);
    this.formulario.reset({ nombre: '', codigo: '', fechaInicio: '' });
  }

  async guardar(): Promise<void> {
    if (this.formulario.invalid) {
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      const origenId = this.periodoOrigenId();
      const url = origenId !== null ? `/api/periodos-censales/${origenId}/iniciar-nuevo` : '/api/periodos-censales';
      await firstValueFrom(this.http.post(url, this.formulario.getRawValue()));
      this.periodoOrigenId.set(null);
      this.formulario.reset({ nombre: '', codigo: '', fechaInicio: '' });
      await this.recargar();
    } catch {
      this.error.set(
        this.periodoOrigenId() !== null ? 'periodoCensal.errorIniciarNuevo' : 'periodoCensal.errorCrear',
      );
    } finally {
      this.guardando.set(false);
    }
  }

  async abrir(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`/api/periodos-censales/${id}/abrir`, {}));
    await this.recargar();
  }

  async cerrar(id: number): Promise<void> {
    await firstValueFrom(this.http.post(`/api/periodos-censales/${id}/cerrar`, {}));
    await this.recargar();
  }
}
