import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
  async login(
    @Body() loginDto: LoginDto,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.authService.login(loginDto, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cerrar sesión (HU-55)',
    description: 'Finaliza la sesión activa del usuario revocando el identificador de sesión en la base de datos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión finalizada exitosamente',
    schema: {
      example: {
        message: 'Sesión finalizada exitosamente',
      },
    },
  })
  async logout(@Request() req: any) {
    return this.authService.logout(req.user?.sessionId);
  }
}
