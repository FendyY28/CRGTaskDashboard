import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailVerifierService } from '../common/email-verifier.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: {
    verifyEmail: jest.Mock;
    login: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
    sendChangePasswordOTP: jest.Mock;
    changePassword: jest.Mock;
    adminResetPassword: jest.Mock;
  };
  let emailServiceMock: { verify: jest.Mock };

  beforeEach(async () => {
    authServiceMock = {
      verifyEmail: jest.fn(),
      login: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      sendChangePasswordOTP: jest.fn(),
      changePassword: jest.fn(),
      adminResetPassword: jest.fn(),
    };
    emailServiceMock = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: EmailVerifierService, useValue: emailServiceMock },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('validateEmail', () => {
    it('returns success when the email is valid', async () => {
      emailServiceMock.verify.mockResolvedValue(true);
      await expect(controller.validateEmail('user@example.com')).resolves.toEqual({ success: true });
      expect(emailServiceMock.verify).toHaveBeenCalledWith('user@example.com');
    });

    it('throws BadRequestException when the email is invalid', async () => {
      emailServiceMock.verify.mockResolvedValue(false);
      await expect(controller.validateEmail('bad@example.com')).rejects.toThrow(BadRequestException);
    });
  });

  describe('delegation to AuthService', () => {
    it('verifyEmail delegates to AuthService.verifyEmail', async () => {
      authServiceMock.verifyEmail.mockResolvedValue({ success: true });
      await expect(controller.verifyEmail('tok-123')).resolves.toEqual({ success: true });
      expect(authServiceMock.verifyEmail).toHaveBeenCalledWith('tok-123');
    });

    it('login delegates the body to AuthService.login', async () => {
      const body = { email: 'user@example.com', password: 'secret' };
      authServiceMock.login.mockResolvedValue({ token: 'jwt' });
      await expect(controller.login(body)).resolves.toEqual({ token: 'jwt' });
      expect(authServiceMock.login).toHaveBeenCalledWith(body);
    });

    it('changePassword uses the userId from the request, not the body', async () => {
      authServiceMock.changePassword.mockResolvedValue({ success: true });
      const req = { user: { id: 'user-1' } };
      const body = { oldPassword: 'a', newPassword: 'b', otp: '123456' };

      await expect(controller.changePassword(req, body)).resolves.toEqual({ success: true });
      expect(authServiceMock.changePassword).toHaveBeenCalledWith('user-1', body);
    });

    it('adminResetPassword passes the route param id', async () => {
      authServiceMock.adminResetPassword.mockResolvedValue({ success: true });
      await expect(controller.adminResetPassword('target-id')).resolves.toEqual({ success: true });
      expect(authServiceMock.adminResetPassword).toHaveBeenCalledWith('target-id');
    });
  });
});
