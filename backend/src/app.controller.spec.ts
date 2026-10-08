import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appServiceMock: { getHello: jest.Mock };

  beforeEach(async () => {
    appServiceMock = { getHello: jest.fn().mockReturnValue('Hello World!') };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: appServiceMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should delegate to AppService.getHello', () => {
      appController.getHello();
      expect(appServiceMock.getHello).toHaveBeenCalledTimes(1);
    });

    it('should return whatever AppService returns', () => {
      appServiceMock.getHello.mockReturnValue('Bonjour');
      expect(appController.getHello()).toBe('Bonjour');
    });
  });
});
