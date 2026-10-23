import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { LoginDto, ResetPasswordDto } from './auth/dto/auth.dto';
import { UpdateUserDto } from './user/dto/create-user.dto';
import { CreateProjectDto } from './project/dto/create-project.dto';
import {
  CreateTestCaseDto,
  UpdateTestCaseDto,
} from './project/dto/project-payloads.dto';

/**
 * Exercises the exact ValidationPipe configuration from main.ts
 * (whitelist + transform + skipUndefinedProperties), so the assertions here
 * describe real runtime behaviour rather than an idealised setup.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  skipUndefinedProperties: true,
});

const meta = (metatype: new (...args: any[]) => any) =>
  ({ type: 'body', metatype }) as any;

describe('Global ValidationPipe', () => {
  describe('whitelist', () => {
    it('strips client-supplied identity fields that are not on the DTO', async () => {
      const result = await pipe.transform(
        {
          name: 'Project X',
          pic: 'Budi',
          userId: 'victim-user',
          performedBy: 'victim-user',
          isAdmin: true,
        },
        meta(CreateProjectDto),
      );

      expect(result).toEqual({ name: 'Project X', pic: 'Budi' });
      expect(result).not.toHaveProperty('userId');
      expect(result).not.toHaveProperty('performedBy');
    });

    it('keeps every declared field', async () => {
      const payload = {
        title: 'Login works',
        type: 'positive',
        projectId: 'PRJ-001',
      };
      const result = await pipe.transform(payload, meta(CreateTestCaseDto));
      expect(result).toMatchObject(payload);
    });
  });

  describe('invalid input is rejected with 400', () => {
    it('rejects a non-email login', async () => {
      await expect(
        pipe.transform(
          { email: 'not-an-email', password: 'x' },
          meta(LoginDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown role (was previously written straight to the DB)', async () => {
      await expect(
        pipe.transform({ role: 'GOD_MODE' }, meta(UpdateUserDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a progress value above 100', async () => {
      await expect(
        pipe.transform(
          { name: 'P', pic: 'A', overallProgress: 999999 },
          meta(CreateProjectDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown SDLC phase', async () => {
      await expect(
        pipe.transform(
          { name: 'P', pic: 'A', currentPhase: 'Bogus' },
          meta(CreateProjectDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an invalid test case status', async () => {
      await expect(
        pipe.transform({ status: 'maybe' }, meta(UpdateTestCaseDto)),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a password shorter than the policy minimum', async () => {
      await expect(
        pipe.transform(
          { email: 'a@b.com', otp: '123456', password: 'short' },
          meta(ResetPasswordDto),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a password that meets the policy', async () => {
      const result = await pipe.transform(
        { email: 'a@b.com', otp: '123456', password: 'long-enough-1' },
        meta(ResetPasswordDto),
      );
      expect(result).toMatchObject({ email: 'a@b.com' });
    });
  });

  describe('null handling (skipUndefinedProperties skips undefined, not null)', () => {
    it('still rejects an explicit null for an optional field', async () => {
      await expect(
        pipe.transform({ status: null }, meta(UpdateTestCaseDto)),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
