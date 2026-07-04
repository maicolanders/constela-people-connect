import { Injectable } from '@nestjs/common';

export interface EstadoServicio {
  estado: 'ok';
  servicio: string;
}

@Injectable()
export class AppService {
  getEstado(): EstadoServicio {
    return { estado: 'ok', servicio: 'censo-indigena-api' };
  }
}
