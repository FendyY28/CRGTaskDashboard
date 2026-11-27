import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../auth/auth.module';
import { UserCredentialsService } from './user-credentials.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserModule } from './user.module';

/**
 * UserModule wires UserService to UserCredentialsService through an AuthModule
 * forwardRef; this compiles the container so a broken circular dependency
 * fails here rather than at application boot.
 */
describe('UserModule — dependency injection graph', () => {
  it('resolves the controller and both user services', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        UserModule,
        AuthModule,
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        // AuthModule's mailer needs a transport; nothing is ever sent here.
        MailerModule.forRoot({ transport: { streamTransport: true } }),
      ],
    }).compile();

    expect(moduleRef.get(UserService, { strict: false })).toBeInstanceOf(UserService);
    expect(moduleRef.get(UserCredentialsService, { strict: false })).toBeInstanceOf(
      UserCredentialsService,
    );
    expect(moduleRef.get(UserController, { strict: false })).toBeDefined();

    await moduleRef.close();
  });
});
