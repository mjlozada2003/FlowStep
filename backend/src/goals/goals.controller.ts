import { Controller, Post, Get, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Objetivos')
@ApiBearerAuth('JWT-auth')
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar objetivo y generar plan con IA (HU-01, HU-02, HU-09)',
    description: 'Registra un nuevo objetivo para el usuario autenticado y genera automáticamente mediante Google Gemini las etapas y actividades correspondientes.',
  })
  @ApiResponse({
    status: 201,
    description: 'Objetivo y plan de etapas/actividades generados y guardados con éxito.',
    schema: {
      example: {
        goal_id: 1,
        user_id: 1,
        title: 'Aprender Francés Básico',
        user_description: 'Quiero aprender frases esenciales para viajar.',
        priority: 'medium',
        status: 'active',
        start_date: '2026-10-15',
        due_date: '2026-12-31',
        stages: [
          {
            stage_id: 1,
            name: 'Fundamentos de Francés',
            description: 'Bases de pronunciación y vocabulario inicial.',
            sort_order: 1,
            activities: [
              {
                activity_id: 1,
                title: 'Aprender el alfabeto y sonidos vocálicos',
                type: 'learning',
                estimated_minutes: 30,
                sort_order: 1,
                status: 'pending',
              },
            ],
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado. Se requiere un token Bearer válido.',
  })
  create(@Request() req: any, @Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos los objetivos del usuario autenticado',
    description: 'Retorna los objetivos registrados por el usuario ordenados de forma descendente por fecha de creación.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de objetivos recuperada exitosamente.',
  })
  findAll(@Request() req: any) {
    return this.goalsService.findAllByUser(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar detalle completo de un objetivo con etapas y actividades',
    description: 'Obtiene el objetivo específico con todas sus etapas y actividades asociadas.',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Detalle del objetivo con su plan estructurado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado o no pertenece al usuario autenticado.',
  })
  findOne(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.findOne(id, req.user.userId);
  }

  @Get(':id/progress')
  @ApiOperation({
    summary: 'Consultar progreso ponderado del objetivo (HU-03)',
    description: 'Consulta la vista calculada de base de datos (v_goal_progress) retornando porcentaje y métricas ponderadas por minutos de actividades.',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Progreso y estadísticas del objetivo.',
    schema: {
      example: {
        goal_id: 1,
        user_id: 1,
        goal_title: 'Aprender Francés Básico',
        goal_status: 'active',
        total_activities: 8,
        completed_activities: 4,
        total_estimated_minutes: 240,
        completed_estimated_minutes: 120,
        progress_percentage: '50.00',
      },
    },
  })
  getProgress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.getProgress(id, req.user.userId);
  }
}
