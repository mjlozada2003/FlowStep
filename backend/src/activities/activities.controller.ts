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
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
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
  findById(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(req.user.userId, id);
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
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateActivityDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(req.user.userId, id, updateActivityDto);
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
  completeActivity(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.completeActivity(req.user.userId, id);
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
  markAsPending(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.markAsPending(req.user.userId, id);
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
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.remove(req.user.userId, id);
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
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() rescheduleDto: RescheduleActivityDto,
  ) {
    return this.activitiesService.reschedule(req.user.userId, id, rescheduleDto);
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
  getScheduleHistory(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.getScheduleHistory(req.user.userId, id);
  }

  @Post(':id/sessions')
  @ApiOperation({
    summary: 'Registrar tiempo dedicado y dificultades en una actividad (HU-17, HU-18)',
    description: 'Permite registrar los minutos dedicados a una actividad, fecha, nivel de dificultad percibido (1 a 5) y notas u observaciones.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Sesión de trabajo y retroalimentación registrada exitosamente.',
    schema: {
      example: {
        session_id: 1,
        activity_id: 1,
        minutes_spent: 45,
        session_date: '2026-11-04',
        difficulty_level: 3,
        difficulty_notes: 'Me costó entender los primeros conceptos pero logré avanzar.',
        created_at: '2026-11-04T15:16:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de sesión inválidos o dificultad fuera de rango (1-5).',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada o no pertenece al usuario autenticado.',
  })
  logWorkSession(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateWorkSessionDto,
  ) {
    return this.activitiesService.logWorkSession(req.user.userId, id, dto);
  }

  @Get(':id/sessions')
  @ApiOperation({
    summary: 'Consultar sesiones de trabajo y tiempo total dedicado (HU-17)',
    description: 'Retorna el historial de sesiones registradas para la actividad y el total acumulado de minutos invertidos comparado con el tiempo estimado.',
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Historial de sesiones y minutos acumulados.',
    schema: {
      example: {
        activity_id: 1,
        activity_title: 'Estudiar gramática básica',
        estimated_minutes: 60,
        total_logged_minutes: 45,
        sessions: [
          {
            session_id: 1,
            activity_id: 1,
            minutes_spent: 45,
            session_date: '2026-11-04',
            difficulty_level: 3,
            difficulty_notes: 'Me costó entender los primeros conceptos pero logré avanzar.',
            created_at: '2026-11-04T15:16:00.000Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada.',
  })
  getWorkSessions(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.activitiesService.getWorkSessions(req.user.userId, id);
  }
}
