import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StagesService } from './stages.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateActivityDto } from '../activities/dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Etapas')
@ApiBearerAuth('JWT-auth')
@Controller('stages')
@UseGuards(JwtAuthGuard)
export class StagesController {
  constructor(
    private readonly stagesService: StagesService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get(':id/activities')
  @ApiOperation({
    summary: 'Consultar actividades ordenadas de una etapa (HU-10)',
    description: 'Retorna la lista de actividades asociadas a una etapa específica ordenadas según su orden de ejecución.',
  })
  @ApiParam({ name: 'id', description: 'ID de la etapa', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades de la etapa recuperada con éxito.',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Se requiere un token Bearer válido.',
  })
  getActivitiesByStage(@Param('id', ParseIntPipe) id: number) {
    return this.stagesService.getActivitiesByStage(id);
  }

  @Post(':id/activities')
  @ApiOperation({
    summary: 'Agregar una actividad propia a la etapa (HU-13)',
    description: 'Permite al usuario incorporar acciones manuales adicionales dentro de una etapa de su plan para alcanzar su objetivo.',
  })
  @ApiParam({ name: 'id', description: 'ID de la etapa a la que pertenecerá la actividad', example: 1 })
  @ApiResponse({
    status: 201,
    description: 'Actividad manual agregada exitosamente.',
    schema: {
      example: {
        activity_id: 10,
        stage_id: 1,
        title: 'Repasar conceptos con tarjetas de memoria',
        description: 'Sesión de 30 minutos de vocabulario',
        type: 'practice',
        priority: 'medium',
        origin: 'manual',
        status: 'pending',
        estimated_minutes: 30,
        sort_order: 4,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Etapa no encontrada.',
  })
  addActivity(
    @Param('id', ParseIntPipe) id: number,
    @Body() createActivityDto: CreateActivityDto,
  ) {
    return this.activitiesService.createForStage(id, createActivityDto);
  }
}
