import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';

describe('AppService', () => {
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      providers: [AppService],
    }).compile();

    appService = app.get<AppService>(AppService);
  });

  describe('getHello', () => {
    it('should return "Hello World!" consistently across calls', () => {
      const result = appService.getHello();
      expect(result).toBe('Hello World!');
      expect(appService.getHello()).toBe(result);
    });
  });
});
