import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HabitantesOfflineService } from '@censo/web-poblacion-data-access';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Fase de mejora continua: pantalla "hub" de un habitante ya registrado —
 * extraída de `HabitanteFormComponent` (antes era el banner inline mostrado
 * tras guardar). Todas las pantallas de captura relacionadas con un
 * habitante/hogar (alta de habitante, ubicación del hogar, vivienda del
 * hogar, educación, economía, migración, identificación étnica) navegan de
 * vuelta aquí al terminar, con un mensaje de éxito o error (ver `resultado`
 * y `mensaje` en los query params), en vez de mostrar su propio banner
 * inline — así el usuario siempre aterriza en el mismo punto central desde
 * donde puede continuar con cualquier otro registro del mismo habitante.
 */
@Component({
  selector: 'app-habitante-acciones',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './habitante-acciones.component.html',
})
export class HabitanteAccionesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly habitantesOffline = inject(HabitantesOfflineService);

  hogarUuid = '';
  habitanteUuid = '';
  readonly nombreHabitante = signal<string | null>(null);
  readonly resultado = signal<'exito' | 'error' | null>(null);
  readonly mensaje = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    this.hogarUuid = this.route.snapshot.paramMap.get('hogarUuid') ?? '';
    this.habitanteUuid = this.route.snapshot.paramMap.get('habitanteUuid') ?? '';

    const resultado = this.route.snapshot.queryParamMap.get('resultado');
    this.resultado.set(resultado === 'exito' || resultado === 'error' ? resultado : null);
    this.mensaje.set(this.route.snapshot.queryParamMap.get('mensaje'));

    const habitante = await this.habitantesOffline.obtener(this.habitanteUuid);
    if (habitante) {
      this.nombreHabitante.set(`${habitante.nombres} ${habitante.apellidos}`);
    }
  }
}
