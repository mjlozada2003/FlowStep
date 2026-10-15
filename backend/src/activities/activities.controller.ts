import { Controller, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Actividades')
@ApiBearerAuth('JWT-auth')
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

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
        completed_at: '2026-10-15T12:30:00.000Z',
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
}
