import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

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
}
