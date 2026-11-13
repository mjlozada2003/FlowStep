import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private dataSource: DataSource,
  ) {}

  async login(loginDto: LoginDto, userAgent?: string) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // HU-55: Crear registro de sesión en AUTH_SESSION para trazabilidad y logout revocable
    const sessionRows = await this.dataSource.query(
      `INSERT INTO "AUTH_SESSION" (user_id, expires_at, user_agent)
       VALUES ($1, CURRENT_TIMESTAMP + INTERVAL '7 days', $2)
       RETURNING session_id`,
      [user.user_id, userAgent || null],
    );
    const sessionId = sessionRows[0]?.session_id;

    const payload = { sub: user.user_id, email: user.email, sid: sessionId };

    return {
      access_token: await this.jwtService.signAsync(payload),
      session_id: sessionId,
      user: {
        id: user.user_id,
        name: user.name,
        email: user.email,
      },
    };
  }

  // HU-55: Cerrar sesión revocando el token en la base de datos
  async logout(sessionId?: string): Promise<{ message: string }> {
    if (sessionId) {
      await this.dataSource.query(
        'UPDATE "AUTH_SESSION" SET revoked_at = CURRENT_TIMESTAMP WHERE session_id = $1',
        [sessionId],
      );
    }
    return { message: 'Sesión finalizada exitosamente' };
  }
}
