import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación y Usuarios')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión (HU-54)',
    description: 'Valida las credenciales del usuario y retorna un token JWT firmado para autenticar las peticiones subsecuentes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Autenticación exitosa. Retorna el token JWT y los datos básicos del usuario.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          user_id: 1,
          name: 'Juan Pérez',
          email: 'juan.perez@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Credenciales inválidas (correo o contraseña incorrectos)',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}
