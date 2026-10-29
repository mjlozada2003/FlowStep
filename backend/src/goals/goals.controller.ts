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
