import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { BulkAvailabilityDto } from './dto/bulk-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Disponibilidad')
@ApiBearerAuth('JWT-auth')
@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar una franja horaria de disponibilidad (HU-35, HU-07)',
    description: 'Permite al usuario registrar un día y rango horario recurrente en el que puede dedicar tiempo a sus objetivos.',
  })
  @ApiResponse({
    status: 201,
    description: 'Franja de disponibilidad registrada con éxito.',
    schema: {
      example: {
        availability_id: 1,
        user_id: 1,
        day_of_week: 'monday',
        start_time: '18:00',
        end_time: '20:00',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la hora de fin no es posterior a la hora de inicio.',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto: Ya existe una franja registrada para ese mismo día y hora de inicio.',
  })
  create(@Request() req: any, @Body() createDto: CreateAvailabilityDto) {
    return this.availabilityService.create(req.user.userId, createDto);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Registrar la rutina semanal completa en lote (HU-35, HU-07)',
    description: 'Reemplaza y configura todas las franjas horarias de disponibilidad semanal del usuario en una sola operación.',
  })
  @ApiResponse({
    status: 201,
    description: 'Disponibilidad semanal guardada con éxito.',
  })
  bulkSet(@Request() req: any, @Body() bulkDto: BulkAvailabilityDto) {
    return this.availabilityService.bulkSet(req.user.userId, bulkDto.availabilities);
  }

  @Get()
  @ApiOperation({
    summary: 'Consultar la disponibilidad semanal configurada por el usuario',
    description: 'Retorna todas las franjas horarias registradas por el usuario autenticado ordenadas cronológicamente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de franjas horarias recuperada exitosamente.',
  })
  findAll(@Request() req: any) {
    return this.availabilityService.findAllByUser(req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una franja horaria de disponibilidad',
    description: 'Elimina la franja horaria especificada perteneciente al usuario autenticado.',
  })
  @ApiParam({ name: 'id', description: 'ID de la disponibilidad a eliminar', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Franja eliminada exitosamente.',
    schema: {
      example: {
        message: 'Franja de disponibilidad eliminada correctamente',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Franja no encontrada.',
  })
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.availabilityService.remove(req.user.userId, id);
  }
}
