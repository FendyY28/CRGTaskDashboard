import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Role } from './roles.decorator';

/** Claims this service signs into the access token (see AuthService.login). */
export interface JwtClaims {
  sub?: string;
  email?: string;
  name?: string;
  role?: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in the environment.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtClaims) {
    if (!payload.sub) {
      throw new UnauthorizedException('Token tidak valid');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}