import { Controller, Post, Get, Patch, Body, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Autenticación y Usuarios')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un nuevo usuario (HU-53)',
    description: 'Crea una nueva cuenta de usuario en la plataforma con contraseña encriptada.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    schema: {
      example: {
        message: 'Usuario registrado exitosamente',
        user: {
          user_id: 1,
          name: 'Juan Pérez',
          email: 'juan.perez@example.com',
          created_at: '2026-10-15T12:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o el correo ya se encuentra registrado',
  })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.register(createUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('preferences')
  @ApiOperation({
    summary: 'Consultar preferencias del usuario (HU-49)',
    description: 'Retorna las preferencias configuradas de avisos, recordatorios, resumen periódico, ordenación de metas y duración de sesión a través de v_user_preferences.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias recuperadas exitosamente.',
  })
  getPreferences(@Request() req: any) {
    return this.usersService.getPreferences(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Patch('preferences')
  @ApiOperation({
    summary: 'Actualizar preferencias del usuario (HU-49)',
    description: 'Guarda o actualiza las preferencias de notificaciones, recordatorios, orden por prioridad y zona horaria en USER_PREFERENCE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas exitosamente.',
  })
  updatePreferences(@Request() req: any, @Body() dto: UpdatePreferencesDto) {
    return this.usersService.updatePreferences(req.user.userId, dto);
  }
}
