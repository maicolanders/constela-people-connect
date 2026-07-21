import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/**
 * Fase 14: descarga de la constancia de afiliación a resguardo indígena
 * (PDF generado server-side, `GET /etnia-vulnerabilidad/mi-constancia`).
 * Requiere que el habitante ya tenga un resguardo/territorio asociado
 * (ver `MiSaludComponent`) — si no, el backend responde 404.
 */
@Component({
  selector: 'app-mi-constancia',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './mi-constancia.component.html',
})
export class MiConstanciaComponent {
  private readonly http = inject(HttpClient);

  readonly generando = signal(false);
  readonly error = signal<string | null>(null);

  async descargar(): Promise<void> {
    if (this.generando()) {
      return;
    }

    this.generando.set(true);
    this.error.set(null);
    try {
      const blob = await firstValueFrom(
        this.http.get('/api/etnia-vulnerabilidad/mi-constancia', { responseType: 'blob' }),
      );
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'constancia-afiliacion.pdf';
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse && error.status === 404
          ? 'autogestion.errorConstanciaSinResguardo'
          : 'autogestion.errorConstanciaGenerica',
      );
    } finally {
      this.generando.set(false);
    }
  }
}
