import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();
  });

  describe('getEstado', () => {
    it('debe reportar estado ok', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getEstado()).toEqual({ estado: 'ok', servicio: 'censo-indigena-api' });
    });
  });
});
