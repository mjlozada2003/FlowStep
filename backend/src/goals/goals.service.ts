import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivitySchedule } from '../activities/entities/activity-schedule.entity';
import { AvailabilityService } from '../availability/availability.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalQueryDto } from './dto/goal-query.dto';
import { AiService, UserAvailabilitySlot } from '../ai/ai.service';
import { ActivityOrigin, ActivityStatus, ActivityType } from '../activities/enums/activity.enum';
import { GoalStatus, PriorityLevel } from './enums/goal.enum';
import { ScheduleReason } from '../activities/enums/schedule-reason.enum';

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Stage)
    private stagesRepository: Repository<Stage>,
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    @InjectRepository(ActivitySchedule)
    private schedulesRepository: Repository<ActivitySchedule>,
    private availabilityService: AvailabilityService,
    private aiService: AiService,
  ) {}

  private calculateSequentialDates(
    startDate: Date | string,
    availabilities: UserAvailabilitySlot[],
    totalCount: number,
  ): { scheduled_date: string; start_time?: string; end_time?: string }[] {
    const schedules: { scheduled_date: string; start_time?: string; end_time?: string }[] = [];
    const cursor = new Date(startDate || new Date());
    cursor.setHours(0, 0, 0, 0);

    if (availabilities && availabilities.length > 0) {
      // Avanzar día a día emparejando con los horarios configurados por el usuario
      while (schedules.length < totalCount) {
        const dayOfWeekNum = cursor.getDay();
        const matchingSlots = availabilities.filter(
          (slot) => DAY_MAP[slot.day_of_week.toLowerCase()] === dayOfWeekNum,
        );

        for (const slot of matchingSlots) {
          if (schedules.length < totalCount) {
            const year = cursor.getFullYear();
            const month = String(cursor.getMonth() + 1).padStart(2, '0');
            const day = String(cursor.getDate()).padStart(2, '0');
            schedules.push({
              scheduled_date: `${year}-${month}-${day}`,
              start_time: slot.start_time,
              end_time: slot.end_time,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    } else {
      // Si el usuario aún no configuró disponibilidad, distribuir a partir de la fecha de inicio
      for (let i = 0; i < totalCount; i++) {
        const year = cursor.getFullYear();
        const month = String(cursor.getMonth() + 1).padStart(2, '0');
        const day = String(cursor.getDate()).padStart(2, '0');
        schedules.push({
          scheduled_date: `${year}-${month}-${day}`,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return schedules;
  }

  async create(userId: number, createGoalDto: CreateGoalDto): Promise<Goal | null> {
    // 1. Guardar la meta base (HU-01)
    const newGoal = this.goalsRepository.create({
      user_id: userId,
      ...createGoalDto,
    });
    const savedGoal = await this.goalsRepository.save(newGoal);

    // 2. Consultar la disponibilidad del usuario (HU-36 & HU-07)
    const userAvailabilities = await this.availabilityService.findAllByUser(userId);
    const availabilityPreferences = await this.availabilityService.getPreferences(userId);

    // 3. Generar el plan con IA adaptado a la disponibilidad (HU-02, HU-09, HU-36)
    try {
      const plan = await this.aiService.generateInitialPlan(
        savedGoal.title,
        savedGoal.user_description,
        userAvailabilities,
        availabilityPreferences.session_duration_minutes,
      );

      // 4. Guardar las etapas y actividades
      if (plan && plan.stages) {
        // Contar el total de actividades para planificar fechas
        let totalActivities = 0;
        for (const stage of plan.stages) {
          totalActivities += stage.activities?.length || 0;
        }

        const plannedDates = this.calculateSequentialDates(
          savedGoal.start_date,
          userAvailabilities,
          totalActivities,
        );

        let dateIndex = 0;

        for (const stageData of plan.stages) {
          const newStage = this.stagesRepository.create({
            goal_id: savedGoal.goal_id,
            name: stageData.name,
            description: stageData.description,
            sort_order: stageData.sort_order,
          });
          const savedStage = await this.stagesRepository.save(newStage);

          if (stageData.activities) {
            for (const act of stageData.activities) {
              const newActivity = this.activitiesRepository.create({
                stage_id: savedStage.stage_id,
                title: act.title,
                type: Object.values(ActivityType).includes(act.type as ActivityType)
                  ? (act.type as ActivityType)
                  : ActivityType.LEARNING,
                estimated_minutes: act.estimated_minutes,
                sort_order: act.sort_order,
                origin: ActivityOrigin.INITIAL_PLAN,
                status: ActivityStatus.PENDING,
              });
              const savedActivity = await this.activitiesRepository.save(newActivity);

              // 5. Crear la versión 1 en ACTIVITY_SCHEDULE (HU-14 y HU-36)
              const scheduleInfo = plannedDates[dateIndex++];
              if (scheduleInfo) {
                const initialSchedule = this.schedulesRepository.create({
                  activity_id: savedActivity.activity_id,
                  version_number: 1,
                  scheduled_date: scheduleInfo.scheduled_date,
                  start_time: scheduleInfo.start_time,
                  end_time: scheduleInfo.end_time,
                  reason: ScheduleReason.INITIAL_PLAN,
                });
                await this.schedulesRepository.save(initialSchedule);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('No se pudo generar el plan automático adaptado con IA:', error);
    }

    // 6. Retornar el goal completo con sus etapas, actividades y cronogramas
    return this.goalsRepository.findOne({
      where: { goal_id: savedGoal.goal_id },
      relations: {
        stages: {
          activities: {
            schedules: true,
          },
        },
      },
      order: {
        stages: {
          sort_order: 'ASC',
          activities: {
            sort_order: 'ASC',
          },
        },
      },
    });
  }

  async findAllByUser(userId: number): Promise<Goal[]> {
    return this.goalsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async findOneByUser(userId: number, goalId: number): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
      relations: {
        stages: {
          activities: {
            schedules: true,
          },
        },
      },
      order: {
        stages: {
          sort_order: 'ASC',
          activities: {
            sort_order: 'ASC',
          },
        },
      },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    return goal;
  }

  async findOne(goalId: number, userId: number): Promise<Goal> {
    return this.findOneByUser(userId, goalId);
  }

  async getProgress(goalId: number, userId: number): Promise<any> {
    const result = await this.goalsRepository.query(
      'SELECT * FROM v_goal_progress WHERE goal_id = $1 AND user_id = $2',
      [goalId, userId],
    );
    if (result && result.length > 0) {
      return result[0];
    }

    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    return {
      goal_id: goal.goal_id,
      user_id: goal.user_id,
      goal_title: goal.title,
      goal_status: goal.status,
      total_activities: 0,
      completed_activities: 0,
      total_estimated_minutes: 0,
      completed_estimated_minutes: 0,
      progress_percentage: 0,
    };
  }

  async getAllGoalsProgress(userId: number): Promise<any[]> {
    return this.goalsRepository.query(
      'SELECT * FROM v_goal_progress WHERE user_id = $1 ORDER BY goal_id ASC',
      [userId],
    );
  }

  async getGoalPace(goalId: number, userId: number): Promise<any> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const result = await this.goalsRepository.query(
      'SELECT * FROM v_goal_pace WHERE goal_id = $1 AND user_id = $2',
      [goalId, userId],
    );

    const paceData = result && result.length > 0 ? result[0] : null;

    if (!paceData) {
      return {
        goal_id: goal.goal_id,
        user_id: goal.user_id,
        goal_title: goal.title,
        goal_status: goal.status,
        pace_status: 'no_schedule',
        is_delayed: false,
        delay_minutes: 0,
        delay_percentage: 0,
        alert_message: 'Aún no cuentas con actividades programadas en el cronograma para medir el ritmo.',
      };
    }

    const completedMinutes = Number(paceData.completed_estimated_minutes || 0);
    const expectedMinutes = Number(paceData.expected_completed_minutes || 0);
    const currentProgress = Number(paceData.progress_percentage || 0);
    const expectedProgress = Number(paceData.expected_progress_percentage || 0);

    const isDelayed = paceData.pace_status === 'behind';
    const delayMinutes = isDelayed ? Math.max(0, expectedMinutes - completedMinutes) : 0;
    const delayPercentage = isDelayed
      ? Number(Math.max(0, expectedProgress - currentProgress).toFixed(2))
      : 0;

    let alertMessage = '';
    if (isDelayed) {
      alertMessage = `Atención: Tienes un posible retraso de ${delayMinutes} minutos (${delayPercentage}% por debajo del plan esperado a la fecha). Te recomendamos reprogramar o dedicar una sesión de estudio.`;
    } else if (paceData.pace_status === 'on_track') {
      alertMessage = '¡Excelente! Tu avance está al día con el cronograma planificado.';
    } else {
      alertMessage = 'Aún no cuentas con actividades programadas en el cronograma para medir el ritmo.';
    }

    return {
      ...paceData,
      is_delayed: isDelayed,
      delay_minutes: delayMinutes,
      delay_percentage: delayPercentage,
      alert_message: alertMessage,
    };
  }

  async getAllGoalsPace(userId: number): Promise<any[]> {
    const results = await this.goalsRepository.query(
      'SELECT * FROM v_goal_pace WHERE user_id = $1 ORDER BY goal_id ASC',
      [userId],
    );

    return results.map((row: any) => {
      const isDelayed = row.pace_status === 'behind';
      const completedMinutes = Number(row.completed_estimated_minutes || 0);
      const expectedMinutes = Number(row.expected_completed_minutes || 0);
      const currentProgress = Number(row.progress_percentage || 0);
      const expectedProgress = Number(row.expected_progress_percentage || 0);

      const delayMinutes = isDelayed ? Math.max(0, expectedMinutes - completedMinutes) : 0;
      const delayPercentage = isDelayed
        ? Number(Math.max(0, expectedProgress - currentProgress).toFixed(2))
        : 0;

      let alertMessage = '';
      if (isDelayed) {
        alertMessage = `Posible retraso de ${delayMinutes} min (${delayPercentage}% por debajo del plan).`;
      } else if (row.pace_status === 'on_track') {
        alertMessage = 'Avance al día.';
      } else {
        alertMessage = 'Sin cronograma activo.';
      }

      return {
        ...row,
        is_delayed: isDelayed,
        delay_minutes: delayMinutes,
        delay_percentage: delayPercentage,
        alert_message: alertMessage,
      };
    });
  }

  async getGoalChartData(goalId: number, userId: number): Promise<any> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const weeklyData = await this.goalsRepository.query(
      `SELECT week_start,
              minutes_spent::integer AS minutes_spent,
              completed_estimated_minutes::integer AS completed_estimated_minutes,
              planned_estimated_minutes::integer AS planned_estimated_minutes
       FROM v_goal_weekly_progress
       WHERE goal_id = $1 AND user_id = $2
       ORDER BY week_start ASC`,
      [goalId, userId],
    );

    const stageData = await this.goalsRepository.query(
      `SELECT stage_id, stage_name, sort_order, total_activities, completed_activities,
              total_estimated_minutes, completed_estimated_minutes, progress_percentage
       FROM v_stage_progress
       WHERE goal_id = $1
       ORDER BY sort_order ASC, stage_id ASC`,
      [goalId],
    );

    const statusDistributionRaw = await this.goalsRepository.query(
      `SELECT a.status, COUNT(a.activity_id)::integer AS count,
              COALESCE(SUM(COALESCE(a.estimated_minutes, 0)), 0)::integer AS total_minutes
       FROM "ACTIVITY" a
       JOIN "STAGE" s ON s.stage_id = a.stage_id
       WHERE s.goal_id = $1 AND a.deleted_at IS NULL
       GROUP BY a.status`,
      [goalId],
    );

    const statusCounts: Record<string, number> = {
      completed: 0,
      in_progress: 0,
      pending: 0,
      skipped: 0,
    };
    let totalActivities = 0;
    statusDistributionRaw.forEach((row: any) => {
      if (statusCounts[row.status] !== undefined) {
        statusCounts[row.status] = Number(row.count);
      }
      totalActivities += Number(row.count);
    });

    const progressSummary = await this.getProgress(goalId, userId);

    const totalMinutesSpent = weeklyData.reduce(
      (acc: number, row: any) => acc + (Number(row.minutes_spent) || 0),
      0,
    );

    return {
      goal_id: goal.goal_id,
      goal_title: goal.title,
      summary: {
        progress_percentage: progressSummary?.progress_percentage ?? 0,
        total_activities: totalActivities,
        completed_activities: statusCounts.completed,
        total_estimated_minutes: Number(progressSummary?.total_estimated_minutes || 0),
        completed_estimated_minutes: Number(progressSummary?.completed_estimated_minutes || 0),
        total_minutes_spent: totalMinutesSpent,
      },
      weekly_progress: weeklyData,
      status_distribution: statusCounts,
      stage_progress: stageData,
    };
  }

  async getGoalWeeklyProgress(goalId: number, userId: number): Promise<any[]> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    return this.goalsRepository.query(
      `SELECT week_start,
              minutes_spent::integer AS minutes_spent,
              completed_estimated_minutes::integer AS completed_estimated_minutes,
              planned_estimated_minutes::integer AS planned_estimated_minutes
       FROM v_goal_weekly_progress
       WHERE goal_id = $1 AND user_id = $2
       ORDER BY week_start ASC`,
      [goalId, userId],
    );
  }

  async updatePriority(userId: number, goalId: number, priority: PriorityLevel): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    goal.priority = priority;
    return this.goalsRepository.save(goal);
  }

  async update(userId: number, goalId: number, updateGoalDto: UpdateGoalDto): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    Object.assign(goal, updateGoalDto);
    return this.goalsRepository.save(goal);
  }

  // HU-44, HU-45, HU-48: Visión general de objetivos con ritmo y ordenamiento por prioridad
  async getOverview(userId: number, query?: GoalQueryDto): Promise<any[]> {
    let sql = 'SELECT * FROM v_goal_overview WHERE user_id = $1';
    const params: any[] = [userId];

    if (query?.status && query.status !== 'all') {
      sql += ' AND status = $2';
      params.push(query.status);
    }

    if (query?.sortBy === 'due_date') {
      sql += ' ORDER BY due_date ASC NULLS LAST';
    } else if (query?.sortBy === 'created_at') {
      sql += ' ORDER BY created_at DESC';
    } else {
      sql += ' ORDER BY sort_position ASC';
    }

    return this.goalsRepository.query(sql, params);
  }

  // HU-48: Resumen general de metas y progreso global del usuario
  async getUserSummary(userId: number): Promise<any> {
    const rows = await this.goalsRepository.query(
      'SELECT * FROM v_user_goal_summary WHERE user_id = $1',
      [userId],
    );
    return rows[0] || null;
  }

  // HU-47: Historial de objetivos anteriores (archivados y completados)
  async getGoalHistory(userId: number, status?: string): Promise<any[]> {
    let sql = 'SELECT * FROM v_goal_history WHERE user_id = $1';
    const params: any[] = [userId];

    if (status && status !== 'all') {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY closed_at DESC NULLS LAST';
    return this.goalsRepository.query(sql, params);
  }

  // HU-25: Alertas activas de retraso
  async getDelayAlerts(userId: number): Promise<any[]> {
    return this.goalsRepository.query(
      'SELECT * FROM v_goal_delay_alert WHERE user_id = $1 ORDER BY priority_rank, max_days_late DESC',
      [userId],
    );
  }

  // HU-23: Resumen periódico / semanal de progreso (agrega barras L-D y desglose por meta)
  async getWeeklySummary(userId: number, startDate?: string, endDate?: string): Promise<any> {
    let sql: string;
    let params: any[];

    if (startDate && endDate) {
      sql = 'SELECT fn_progress_summary($1, $2::date, $3::date) AS summary';
      params = [userId, startDate, endDate];
    } else {
      sql = "SELECT fn_progress_summary($1, date_trunc('week', CURRENT_DATE)::date, (date_trunc('week', CURRENT_DATE)::date + 6)::date) AS summary";
      params = [userId];
    }

    const rows = await this.goalsRepository.query(sql, params);
    const data = rows[0]?.summary || {};
    const completed = Number(data.completed_activities || 0);
    const pending = Number(data.pending_activities || 0);
    const rate = Number(data.completion_rate_pct || 0);
    const minutes = Number(data.dedicated_minutes || 0);
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    const hoursSpent = hours > 0 ? `${hours} h ${remMin > 0 ? remMin : ''}`.trim() : `${remMin} min`;
    const start = data.period?.start_date || '';
    const end = data.period?.end_date || '';

    return {
      period: start && end ? `${start} al ${end}` : 'Semana en curso',
      tagline: 'RESUMEN SEMANAL',
      title: rate >= 70 ? 'Una semana constante' : 'Progreso en marcha',
      description: `Completaste el ${rate}% de lo planificado.`,
      completionRate: rate,
      completedCount: completed,
      pendingCount: pending,
      hoursSpent,
      daysActivity: (data.daily_activity || []).map((d: any) => ({
        day: d.day_initial || '?',
        active: Number(d.count || 0) > 0,
        height: Math.min(100, Math.max(15, Number(d.count || 0) * 30)),
      })),
      goalsBreakdown: (data.goals_breakdown || []).map((g: any) => ({
        id: g.goal_id,
        title: g.title,
        detail: `${g.completed || 0} completadas · ${g.pending || 0} pendientes`,
        progress: `${Number(g.delta_pct || 0) >= 0 ? '+' : ''}${g.delta_pct || 0}%`,
      })),
      mascotTip: rate >= 70
        ? 'Tu constancia creció esta semana. Cada sesión cuenta.'
        : 'Mantén el ritmo, cada pequeño paso te acerca a tu meta.',
    };
  }

  // HU-32: Pausar objetivo
  async pauseGoal(userId: number, goalId: number, reason?: string): Promise<Goal> {
    return this.changeGoalStatus(userId, goalId, GoalStatus.PAUSED, reason);
  }

  // HU-33: Reanudar objetivo
  async resumeGoal(userId: number, goalId: number, reason?: string): Promise<Goal> {
    return this.changeGoalStatus(userId, goalId, GoalStatus.ACTIVE, reason);
  }

  // HU-46: Archivar objetivo
  async archiveGoal(userId: number, goalId: number, reason?: string): Promise<Goal> {
    return this.changeGoalStatus(userId, goalId, GoalStatus.ARCHIVED, reason);
  }

  // Transición de estado con trazabilidad (trigger trg_goal_status_before / history)
  async changeGoalStatus(
    userId: number,
    goalId: number,
    newStatus: GoalStatus,
    reason?: string,
  ): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    try {
      await this.goalsRepository.manager.transaction(async (manager) => {
        if (reason) {
          await manager.query("SELECT set_config('flowstep.change_reason', $1, true)", [reason]);
        }
        await manager.update(Goal, { goal_id: goalId }, { status: newStatus });
      });

      return this.findOneByUser(userId, goalId);
    } catch (err: any) {
      if (err.code === '23514') {
        throw new BadRequestException(
          `No se permite cambiar el estado del objetivo de '${goal.status}' a '${newStatus}'`,
        );
      }
      throw err;
    }
  }

  // HU-34: Modificar fecha límite con registro de historial y validación
  async updateDueDate(
    userId: number,
    goalId: number,
    dueDate: string,
    reason?: string,
  ): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    try {
      await this.goalsRepository.manager.transaction(async (manager) => {
        if (reason) {
          await manager.query("SELECT set_config('flowstep.change_reason', $1, true)", [reason]);
        }
        await manager.update(Goal, { goal_id: goalId }, { due_date: new Date(dueDate) });
      });

      return this.findOneByUser(userId, goalId);
    } catch (err: any) {
      if (err.code === '23514') {
        throw new BadRequestException(
          'La nueva fecha límite no es válida (no puede ser anterior a la fecha de inicio del objetivo ni estar en el pasado)',
        );
      }
      throw err;
    }
  }
}
