import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';
import { OfflineIndicatorComponent } from '../offline-indicator/offline-indicator.component';

@Component({
  selector: 'app-shell-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, OfflineIndicatorComponent, TranslatePipe],
  templateUrl: './shell-layout.component.html',
})
export class ShellLayoutComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
