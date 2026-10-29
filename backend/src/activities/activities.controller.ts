import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Actividades')
@ApiBearerAuth('JWT-auth')
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar el detalle de una actividad específica',
    description: 'Obtiene los datos completos de una actividad, incluyendo su etapa, sub-actividades y cronogramas asociados.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la actividad recuperado exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Modificar una actividad (HU-11)',
    description: 'Permite actualizar el título, descripción, tipo, prioridad, duración estimada o estado de una actividad propuesta.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad a modificar', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Actividad modificada exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateActivityDto);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Completar una actividad (HU-15)',
    description: 'Marca el estado de la actividad como "completed" y registra la marca de tiempo "completed_at".',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Actividad marcada como completada exitosamente.',
    schema: {
      example: {
        activity_id: 1,
        stage_id: 1,
        title: 'Aprender el alfabeto y sonidos vocálicos',
        type: 'learning',
        status: 'completed',
        completed_at: '2026-10-28T12:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Se requiere un token Bearer válido.',
  })
  completeActivity(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.completeActivity(id);
  }

  @Patch(':id/pending')
  @ApiOperation({
    summary: 'Mantener actividad como pendiente (HU-16)',
    description: 'Marca una actividad como pendiente ("pending") y restablece su marca de tiempo de completado a nulo.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Actividad marcada como pendiente exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  markAsPending(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.markAsPending(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar una actividad',
    description: 'Elimina de forma permanente o suave la actividad especificada.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Actividad eliminada exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.remove(id);
  }

  @Post(':id/reschedule')
  @ApiOperation({
    summary: 'Reprogramar una actividad sin perder historial (HU-14)',
    description: 'Asigna una nueva fecha y horario a la actividad, creando una nueva versión en ACTIVITY_SCHEDULE y conservando las versiones anteriores para trazabilidad.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad a reprogramar', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Actividad reprogramada exitosamente con nueva versión de cronograma.',
    schema: {
      example: {
        schedule_id: 2,
        activity_id: 1,
        version_number: 2,
        scheduled_date: '2026-11-15',
        start_time: '15:00',
        end_time: '16:30',
        reason: 'user_reschedule',
        created_at: '2026-10-28T14:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o la hora de fin no es posterior a la hora de inicio.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  reschedule(
    @Param('id', ParseIntPipe) id: number,
    @Body() rescheduleDto: RescheduleActivityDto,
  ) {
    return this.activitiesService.reschedule(id, rescheduleDto);
  }

  @Get(':id/schedules')
  @ApiOperation({
    summary: 'Consultar el historial completo de reprogramaciones de una actividad (HU-14)',
    description: 'Retorna todas las versiones históricas de programación de la actividad ordenadas cronológicamente.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Historial de cronogramas recuperado exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  getScheduleHistory(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getScheduleHistory(id);
  }
}
