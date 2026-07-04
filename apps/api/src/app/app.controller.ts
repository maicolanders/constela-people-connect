import { Controller, Get } from '@nestjs/common';
import { Public } from '@censo/api-auth-feature';
import { AppService, EstadoServicio } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  getEstado(): EstadoServicio {
    return this.appService.getEstado();
  }
}
