import { Component, inject, OnInit } from '@angular/core';
import { SyncService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Acción manual de sincronización visible en el shell para todos los roles
 * (el shell raíz no filtra por rol, solo rutas específicas lo hacen). Cubre
 * el caso en que el disparo automático tras guardar un formulario no baste
 * (ej. quedó "en error" esperando una entidad relacionada que ya sincronizó).
 */
@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './sync-status.component.html',
})
export class SyncStatusComponent implements OnInit {
  protected readonly syncService = inject(SyncService);

  ngOnInit(): void {
    void this.syncService.actualizarPendientes();
  }

  sincronizarAhora(): void {
    void this.syncService.sincronizar(true);
  }
}
