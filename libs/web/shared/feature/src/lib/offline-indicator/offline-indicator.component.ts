import { Component, inject } from '@angular/core';
import { SyncService } from '@censo/web-shared-data-access';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-offline-indicator',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './offline-indicator.component.html',
})
export class OfflineIndicatorComponent {
  protected readonly syncService = inject(SyncService);
}
