import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { HabitanteAuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Fase 14: shell propio del portal de autogestión — no reutiliza
 * `ShellLayoutComponent` (staff), que está atado 100% a `AuthService`/sesión
 * de censista. Navegación fija a las secciones del propio habitante.
 */
@Component({
  selector: 'app-autogestion-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './autogestion-shell.component.html',
})
export class AutogestionShellComponent {
  private readonly habitanteAuthService = inject(HabitanteAuthService);
  private readonly router = inject(Router);

  cerrarSesion(): void {
    this.habitanteAuthService.cerrarSesion();
    void this.router.navigate(['/autogestion/login']);
  }
}
