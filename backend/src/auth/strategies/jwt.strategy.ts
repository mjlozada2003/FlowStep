import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_key_for_dev_only',
    });
  }

  async validate(payload: any) {
    // HU-55: Si el token contiene sid, verificamos que la sesión no haya sido revocada ni expirada
    if (payload.sid) {
      const activeRows = await this.dataSource.query(
        'SELECT 1 FROM v_active_auth_session WHERE session_id = $1',
        [payload.sid],
      );
      if (!activeRows || activeRows.length === 0) {
        throw new UnauthorizedException('La sesión ha sido revocada o ha expirado');
      }
    }

    return {
      userId: payload.sub,
      email: payload.email,
      sessionId: payload.sid || null,
    };
  }
}
