import { Controller, Post, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalPriorityDto } from './dto/update-goal-priority.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Objetivos')
@ApiBearerAuth('JWT-auth')
@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({
    summary: 'Registrar objetivo y generar plan adaptado con IA (HU-01, HU-02, HU-09, HU-36)',
    description: 'Registra un nuevo objetivo para el usuario autenticado, consulta su disponibilidad horaria y genera automáticamente mediante Google Gemini las etapas, actividades y cronograma inicial adaptados.',
  })
  @ApiResponse({
    status: 201,
    description: 'Objetivo y plan generado con éxito.',
    schema: {
      example: {
        goal_id: 1,
        user_id: 1,
        title: 'Aprender Francés Básico',
        user_description: 'Quiero aprender frases esenciales para viajar a París.',
        priority: 'high',
        status: 'active',
        start_date: '2026-10-28',
        due_date: '2026-12-31',
        stages: [
          {
            stage_id: 1,
            name: 'Fundamentos de Francés',
            description: 'Bases de pronunciación y vocabulario.',
            sort_order: 1,
            activities: [
              {
                activity_id: 1,
                title: 'Aprender el alfabeto y sonidos vocálicos',
                type: 'learning',
                estimated_minutes: 30,
                sort_order: 1,
                status: 'pending',
                schedules: [
                  {
                    schedule_id: 1,
                    version_number: 1,
                    scheduled_date: '2026-11-02',
                    start_time: '18:00',
                    end_time: '20:00',
                    reason: 'initial_plan',
                  },
                ],
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

  @Get('progress')
  @ApiOperation({
    summary: 'Consultar porcentaje de avance de todos los objetivos del usuario (HU-22)',
    description: 'Consulta el porcentaje ponderado y métricas de avance de todos los objetivos activos del usuario autenticado a través de la vista v_goal_progress.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de avance de los objetivos.',
    schema: {
      example: [
        {
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
      ],
    },
  })
  getAllProgress(@Request() req: any) {
    return this.goalsService.getAllGoalsProgress(req.user.userId);
  }

  @Get('pace')
  @ApiOperation({
    summary: 'Consultar comparativa de ritmo esperado y real de todos los objetivos (HU-24)',
    description: 'Retorna el estado de ritmo (on_track, behind, no_schedule), avance esperado vs. real y posibles retrasos de todas las metas del usuario mediante v_goal_pace.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de ritmo y posibles alertas de retraso.',
  })
  getAllPace(@Request() req: any) {
    return this.goalsService.getAllGoalsPace(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consultar detalle completo de un objetivo con etapas y actividades',
    description: 'Obtiene el objetivo específico con todas sus etapas, actividades y cronogramas asociados.',
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
    return this.goalsService.findOneByUser(req.user.userId, id);
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
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  getProgress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.getProgress(id, req.user.userId);
  }

  @Get(':id/pace')
  @ApiOperation({
    summary: 'Comparar ritmo esperado y real de un objetivo (HU-24)',
    description: 'Compara el progreso real acumulado contra el cronograma esperado a la fecha actual, identificando retrasos y retornando alertas oportunas (pace_status, delay_minutes, alert_message).',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Comparativa de ritmo y detección de retraso.',
    schema: {
      example: {
        goal_id: 1,
        user_id: 1,
        goal_title: 'Aprender Francés Básico',
        goal_status: 'active',
        total_activities: 8,
        completed_activities: 2,
        total_estimated_minutes: 240,
        completed_estimated_minutes: 60,
        progress_percentage: '25.00',
        as_of_date: '2026-11-04',
        scheduled_estimated_minutes: 240,
        expected_completed_minutes: 120,
        expected_progress_percentage: '50.00',
        pace_status: 'behind',
        is_delayed: true,
        delay_minutes: 60,
        delay_percentage: 25.0,
        alert_message: 'Atención: Tienes un posible retraso de 60 minutos (25% por debajo del plan esperado a la fecha). Te recomendamos reprogramar o dedicar una sesión de estudio.',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  getGoalPace(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.getGoalPace(id, req.user.userId);
  }

  @Get(':id/charts')
  @ApiOperation({
    summary: 'Consultar datos agregados para visualización gráfica del progreso (HU-21)',
    description: 'Retorna datos estructurados para renderizar gráficos en la aplicación móvil: serie temporal semanal de esfuerzo y avance (v_goal_weekly_progress), distribución por estados (dona/pastel) y barras de avance comparativo por etapa (v_stage_progress).',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Datos analíticos y de gráficas del objetivo recuperados exitosamente.',
    schema: {
      example: {
        goal_id: 1,
        goal_title: 'Aprender Francés Básico',
        summary: {
          progress_percentage: '50.00',
          total_activities: 8,
          completed_activities: 4,
          total_estimated_minutes: 240,
          completed_estimated_minutes: 120,
          total_minutes_spent: 105,
        },
        weekly_progress: [
          {
            week_start: '2026-11-02',
            minutes_spent: 45,
            completed_estimated_minutes: 60,
            planned_estimated_minutes: 60,
          },
        ],
        status_distribution: {
          completed: 4,
          in_progress: 0,
          pending: 4,
          skipped: 0,
        },
        stage_progress: [
          {
            stage_id: 1,
            stage_name: 'Fundamentos de Francés',
            sort_order: 1,
            total_activities: 4,
            completed_activities: 2,
            progress_percentage: '50.00',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  getGoalChartData(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.getGoalChartData(id, req.user.userId);
  }

  @Get(':id/weekly-progress')
  @ApiOperation({
    summary: 'Consultar serie semanal de esfuerzo y avance de un objetivo (HU-21)',
    description: 'Consulta directamente la vista v_goal_weekly_progress retornando la serie histórica semanal de minutos dedicados, completados y planificados.',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Serie temporal semanal recuperada exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  getWeeklyProgress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.goalsService.getGoalWeeklyProgress(id, req.user.userId);
  }

  @Patch(':id/priority')
  @ApiOperation({
    summary: 'Establecer o modificar la prioridad del objetivo (HU-06)',
    description: 'Permite actualizar el nivel de prioridad de un objetivo existente (high, medium, low).',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Prioridad del objetivo actualizada exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  updatePriority(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalPriorityDto: UpdateGoalPriorityDto,
  ) {
    return this.goalsService.updatePriority(req.user.userId, id, updateGoalPriorityDto.priority);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualizar parcialmente un objetivo',
    description: 'Permite actualizar título, descripción, fecha límite, prioridad o estado del objetivo.',
  })
  @ApiParam({ name: 'id', description: 'ID del objetivo', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Objetivo actualizado exitosamente.',
  })
  @ApiResponse({
    status: 404,
    description: 'Objetivo no encontrado.',
  })
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGoalDto: UpdateGoalDto,
  ) {
    return this.goalsService.update(req.user.userId, id, updateGoalDto);
  }
}
