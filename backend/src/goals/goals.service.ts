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
import { ApplyAlternativeDto } from './dto/apply-alternative.dto';
import { SubmitEvaluationDto } from './dto/submit-evaluation.dto';
import { AddReinforcementDto } from './dto/add-reinforcement.dto';
import {
  RecommendationDiagnostic,
  ReplanAlternativesResponse,
  GoalKnowledgeResponse,
  LearningResourceItem,
  QuizQuestionItem,
  QuizEvaluationResult,
} from '../ai/ai.service';

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
    await this.syncCompletedGoals(userId);
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

  // Sincronizar automáticamente objetivos que alcanzaron el 100% o que fueron reabiertos
  async syncCompletedGoals(userId: number): Promise<void> {
    try {
      await this.goalsRepository.query(
        `UPDATE "GOAL" g
         SET status = 'completed'
         WHERE g.user_id = $1
           AND g.status = 'active'
           AND g.deleted_at IS NULL
           AND EXISTS (
             SELECT 1 FROM "STAGE" s
             JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
             WHERE s.goal_id = g.goal_id
           )
           AND NOT EXISTS (
             SELECT 1 FROM "STAGE" s
             JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
             WHERE s.goal_id = g.goal_id AND a.status != 'completed'
           )`,
        [userId],
      );

      await this.goalsRepository.query(
        `UPDATE "GOAL" g
         SET status = 'active'
         WHERE g.user_id = $1
           AND g.status = 'completed'
           AND g.deleted_at IS NULL
           AND EXISTS (
             SELECT 1 FROM "STAGE" s
             JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
             WHERE s.goal_id = g.goal_id AND a.status != 'completed'
           )`,
        [userId],
      );
    } catch {
      // Ignorar para no bloquear la consulta si la BD no permite la actualización
    }
  }

  // HU-44, HU-45, HU-48: Visión general de objetivos con ritmo y ordenamiento por prioridad
  async getOverview(userId: number, query?: GoalQueryDto): Promise<any[]> {
    await this.syncCompletedGoals(userId);
    let sql = 'SELECT * FROM v_goal_overview WHERE user_id = $1';
    const params: any[] = [userId];

    if (query?.status && query.status !== 'all') {
      sql += ' AND status = $2';
      params.push(query.status);
    }

    let sortBy = query?.sortBy;
    if (!sortBy) {
      try {
        const prefRows = await this.goalsRepository.query(
          'SELECT goals_sort_by FROM v_user_preferences WHERE user_id = $1',
          [userId],
        );
        if (prefRows.length > 0 && prefRows[0].goals_sort_by) {
          sortBy = prefRows[0].goals_sort_by;
        }
      } catch {}
    }

    if (sortBy === 'due_date') {
      sql += ' ORDER BY due_date ASC NULLS LAST';
    } else if (sortBy === 'created_at') {
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
    await this.syncCompletedGoals(userId);
    let sql = 'SELECT * FROM v_goal_history WHERE user_id = $1';
    const params: any[] = [userId];

    if (status && status !== 'all') {
      sql += ' AND status = $2';
      params.push(status);
    }

    sql += ' ORDER BY closed_at DESC NULLS LAST';
    return this.goalsRepository.query(sql, params);
  }

  // HU-25: Alertas activas de retraso respetando preferencia del usuario
  async getDelayAlerts(userId: number): Promise<any[]> {
    try {
      const prefRows = await this.goalsRepository.query(
        'SELECT delay_alerts_enabled FROM v_user_preferences WHERE user_id = $1',
        [userId],
      );
      if (prefRows.length > 0 && prefRows[0].delay_alerts_enabled === false) {
        return [];
      }
    } catch {}

    return this.goalsRepository.query(
      'SELECT *, most_overdue_activity_id AS activity_id, most_overdue_activity_title AS activity_title, max_days_late AS days_delayed FROM v_goal_delay_alert WHERE user_id = $1 ORDER BY priority_rank, max_days_late DESC',
      [userId],
    );
  }

  // HU-23: Resumen periódico / semanal de progreso (agrega barras L-D y desglose por meta)
  async getWeeklySummary(userId: number, startDate?: string, endDate?: string): Promise<any> {
    try {
      const prefRows = await this.goalsRepository.query(
        'SELECT periodic_summary_enabled FROM v_user_preferences WHERE user_id = $1',
        [userId],
      );
      if (prefRows.length > 0 && prefRows[0].periodic_summary_enabled === false) {
        return null;
      }
    } catch {}

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
    const completed = Number(data.completed_activities ?? data.completed_planned_activities ?? 0);
    const pending = Number(data.pending_activities ?? 0);
    const rate = Math.round(Number(data.completion_rate ?? data.completion_rate_pct ?? 0));
    const minutes = Number(data.minutes_spent ?? data.dedicated_minutes ?? 0);
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    const hoursSpent = hours > 0 ? `${hours} h ${remMin > 0 ? remMin : ''}`.trim() : `${remMin} min`;
    const start = data.period_start || data.period?.start_date || '';
    const end = data.period_end || data.period?.end_date || '';

    const dayLetters = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];
    const dailyRaw = Array.isArray(data.daily) ? data.daily : (data.daily_activity || []);
    const daysActivity = dailyRaw.map((d: any) => {
      const dayInitial = d.day_initial || dayLetters[d.iso_day_of_week] || '?';
      const c = Number(d.completed_activities ?? d.count ?? 0);
      const m = Number(d.minutes_spent ?? 0);
      return {
        day: dayInitial,
        active: c > 0 || m > 0,
        height: Math.min(100, Math.max(15, c > 0 ? c * 40 : (m > 0 ? Math.round((m / 60) * 40) : 15))),
      };
    });

    const goalsRaw = Array.isArray(data.goals) ? data.goals : (data.goals_breakdown || []);
    const goalsBreakdown = goalsRaw.map((g: any) => {
      const comp = Number(g.completed_activities ?? g.completed ?? 0);
      const pend = Number(g.pending_activities ?? g.pending ?? 0);
      const delta = Number(g.progress_gain_percentage ?? g.delta_pct ?? 0);
      return {
        id: g.goal_id,
        title: g.title,
        detail: `${comp} completadas · ${pend} pendientes`,
        progress: `${delta >= 0 ? '+' : ''}${Math.round(delta)}%`,
      };
    });

    return {
      period: start && end ? `${start} al ${end}` : 'Semana en curso',
      tagline: 'RESUMEN SEMANAL',
      title: rate >= 70 ? 'Una semana constante' : 'Progreso en marcha',
      description: `Completaste el ${rate}% de lo planificado.`,
      completionRate: rate,
      completedCount: completed,
      pendingCount: pending,
      hoursSpent,
      daysActivity,
      goalsBreakdown,
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

  // HU-46: Archivar objetivo.
  // Si todas sus actividades ya están completadas, el objetivo se cierra como
  // 'completed' en lugar de 'archived' para que aparezca entre los completados.
  async archiveGoal(userId: number, goalId: number, reason?: string): Promise<Goal> {
    const goal = await this.goalsRepository.findOne({
      where: { goal_id: goalId, user_id: userId },
    });

    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    if (await this.isGoalFullyCompleted(goalId)) {
      if (goal.status === GoalStatus.COMPLETED) {
        return this.findOneByUser(userId, goalId);
      }
      // El trigger no permite paused -> completed: se reanuda primero.
      if (goal.status === GoalStatus.PAUSED) {
        await this.changeGoalStatus(userId, goalId, GoalStatus.ACTIVE, reason);
      }
      return this.changeGoalStatus(userId, goalId, GoalStatus.COMPLETED, reason);
    }

    return this.changeGoalStatus(userId, goalId, GoalStatus.ARCHIVED, reason);
  }

  // Un objetivo está completo si tiene actividades y todas están en 'completed'
  private async isGoalFullyCompleted(goalId: number): Promise<boolean> {
    const rows = await this.goalsRepository.query(
      `SELECT COUNT(a.activity_id)::integer AS total,
              COUNT(a.activity_id) FILTER (WHERE a.status = 'completed')::integer AS completed
       FROM "STAGE" s
       JOIN "ACTIVITY" a ON a.stage_id = s.stage_id AND a.deleted_at IS NULL
       WHERE s.goal_id = $1`,
      [goalId],
    );
    const total = Number(rows?.[0]?.total || 0);
    const completed = Number(rows?.[0]?.completed || 0);
    return total > 0 && completed === total;
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

  // HU-04, HU-26, HU-30: Diagnóstico y recomendación asistida por IA para un objetivo
  async getGoalRecommendations(userId: number, goalId: number): Promise<RecommendationDiagnostic> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    // 1. Consultar alerta de retraso
    const delayRows = await this.goalsRepository.query(
      'SELECT * FROM v_goal_delay_alert WHERE goal_id = $1',
      [goalId],
    ).catch(() => []);
    const delayInfo = delayRows && delayRows.length > 0 ? delayRows[0] : null;

    // 2. Consultar notas de dificultad o razones de incumplimiento
    const diffRows = await this.goalsRepository.query(
      `SELECT t.details->>'difficulty_notes' as difficulty_notes,
              t.details->>'difficulty_level' as difficulty_level,
              a.title as activity_title
       FROM v_activity_timeline t
       JOIN "ACTIVITY" a ON a.activity_id = t.activity_id
       JOIN "STAGE" s ON s.stage_id = a.stage_id
       WHERE s.goal_id = $1 AND t.event_type = 'work_session' AND t.details->>'difficulty_notes' IS NOT NULL
       ORDER BY t.event_date DESC LIMIT 1`,
      [goalId],
    ).catch(() => []);
    const diffInfo = diffRows && diffRows.length > 0 ? diffRows[0] : null;

    // 3. Consultar progreso y métricas de v_goal_progress
    const progressRows = await this.goalsRepository.query(
      'SELECT * FROM v_goal_progress WHERE goal_id = $1',
      [goalId],
    ).catch(() => []);
    const progressInfo = progressRows && progressRows.length > 0 ? progressRows[0] : null;

    const progressPercentage = progressInfo ? Number(progressInfo.progress_percentage) || 0 : 0;
    const completedActivities = progressInfo ? Number(progressInfo.completed_activities) || 0 : 0;
    const totalActivities = progressInfo ? Number(progressInfo.total_activities) || 0 : (goal.stages?.reduce((acc, s) => acc + (s.activities?.length || 0), 0) || 0);

    // 4. Horas disponibles del usuario
    let availableHours = 4;
    try {
      const avail = await this.availabilityService.findAllByUser(userId);
      if (avail && avail.length > 0) {
        let totalMinutes = 0;
        for (const slot of avail) {
          const [sh, sm] = slot.start_time.split(':').map(Number);
          const [eh, em] = slot.end_time.split(':').map(Number);
          totalMinutes += (eh * 60 + em) - (sh * 60 + sm);
        }
        if (totalMinutes > 0) {
          availableHours = Math.round(totalMinutes / 60);
        }
      }
    } catch {}

    const overdueActivityTitle = delayInfo?.most_overdue_activity_title || diffInfo?.activity_title || goal.stages?.[0]?.activities?.[0]?.title;
    const maxDaysLate = delayInfo ? Number(delayInfo.max_days_late) || 0 : 0;

    return this.aiService.generateRecommendationDiagnostic(
      goalId,
      goal.title,
      overdueActivityTitle,
      maxDaysLate,
      diffInfo?.difficulty_notes,
      undefined,
      progressPercentage,
      completedActivities,
      totalActivities,
      availableHours,
    );
  }

  // HU-43: Recomendaciones personalizadas para la pantalla de inicio
  async getPersonalizedRecommendations(userId: number): Promise<RecommendationDiagnostic> {
    const delayedGoals = await this.goalsRepository.query(
      'SELECT * FROM v_goal_delay_alert WHERE user_id = $1 ORDER BY priority_rank, max_days_late DESC',
      [userId],
    ).catch(() => []);

    if (delayedGoals && delayedGoals.length > 0) {
      return this.getGoalRecommendations(userId, Number(delayedGoals[0].goal_id));
    }

    const activeGoals = await this.goalsRepository.find({
      where: { user_id: userId, status: GoalStatus.ACTIVE },
      relations: { stages: { activities: true } },
      order: { created_at: 'DESC' },
    });

    if (activeGoals.length > 0) {
      return this.getGoalRecommendations(userId, activeGoals[0].goal_id);
    }

    return {
      goal_id: 0,
      goal_title: 'Tu primer objetivo',
      alert_level: 'info',
      alert_message: 'Crea un objetivo para recibir recomendaciones adaptativas personalizadas.',
      why_suggested: 'Las recomendaciones de FlowStep se activan automáticamente conforme registras tu progreso.',
      solution_focus: 'Iniciar tu planificación',
      solutions: [
        'Define un objetivo con fecha límite.',
        'Configura tu disponibilidad horaria.',
        'Empieza con sesiones de 30 minutos.',
      ],
      metrics: {
        progress_percentage: 0,
        completed_activities: 0,
        total_activities: 0,
        available_hours: 4,
      },
    };
  }

  // HU-27, HU-28, HU-29, HU-30, HU-51: Obtener propuestas alternativas de replanificación
  async getReplanAlternatives(userId: number, goalId: number): Promise<ReplanAlternativesResponse> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const progressRows = await this.goalsRepository.query(
      'SELECT * FROM v_goal_progress WHERE goal_id = $1',
      [goalId],
    ).catch(() => []);
    const progressInfo = progressRows && progressRows.length > 0 ? progressRows[0] : null;

    const progressPercentage = progressInfo ? Number(progressInfo.progress_percentage) || 0 : 0;
    const completedCount = progressInfo ? Number(progressInfo.completed_activities) || 0 : 0;
    const completedHours = progressInfo ? Math.round(((Number(progressInfo.completed_estimated_minutes) || 0) / 60) * 10) / 10 : 0;

    const pendingActivitiesCount = await this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.stage', 'stage')
      .where('stage.goal_id = :goalId', { goalId })
      .andWhere('activity.status != :completed', { completed: ActivityStatus.COMPLETED })
      .andWhere('activity.status != :skipped', { skipped: ActivityStatus.SKIPPED })
      .getCount();

    return this.aiService.generateReplanAlternatives(
      goalId,
      goal.title,
      progressPercentage,
      completedCount,
      completedHours,
      pendingActivitiesCount,
    );
  }

  // HU-31, HU-52, HU-08: Aplicar propuesta de replanificación seleccionada
  async applyReplanAlternative(
    userId: number,
    goalId: number,
    dto: ApplyAlternativeDto,
  ): Promise<{ message: string; proposal_type: string; goal_id: number }> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    if (dto.proposal_type === 'balanced') {
      const pendingActivities = await this.activitiesRepository
        .createQueryBuilder('activity')
        .innerJoin('activity.stage', 'stage')
        .where('stage.goal_id = :goalId', { goalId })
        .andWhere('activity.status != :completed', { completed: ActivityStatus.COMPLETED })
        .andWhere('activity.status != :skipped', { skipped: ActivityStatus.SKIPPED })
        .orderBy('activity.sort_order', 'ASC')
        .getMany();

      const availabilities = await this.availabilityService.findAllByUser(userId);
      const newDates = this.calculateSequentialDates(
        new Date(),
        availabilities,
        pendingActivities.length,
      );

      for (let i = 0; i < pendingActivities.length; i++) {
        const act = pendingActivities[i];
        const dateSlot = newDates[i];
        if (dateSlot) {
          const currentSchedule = await this.schedulesRepository.findOne({
            where: { activity_id: act.activity_id },
            order: { version_number: 'DESC' },
          });
          const nextVersion = (currentSchedule?.version_number || 0) + 1;

          const sched = this.schedulesRepository.create({
            activity_id: act.activity_id,
            version_number: nextVersion,
            scheduled_date: dateSlot.scheduled_date,
            start_time: dateSlot.start_time || '18:00',
            end_time: dateSlot.end_time || '19:00',
            reason: ScheduleReason.AI_ADJUSTMENT,
          });
          await this.schedulesRepository.save(sched);
        }
      }
    } else if (dto.proposal_type === 'learning') {
      const stage = goal.stages?.[0] || await this.stagesRepository.findOne({ where: { goal_id: goalId }, order: { sort_order: 'ASC' } });
      if (stage) {
        const r1 = await this.activitiesRepository.save(
          this.activitiesRepository.create({
            stage_id: stage.stage_id,
            title: `Refuerzo guiado: Conceptos clave de ${goal.title}`,
            description: 'Lectura y síntesis recomendada por IA para afianzar conceptos.',
            type: ActivityType.REINFORCEMENT,
            origin: ActivityOrigin.AI_ADJUSTMENT,
            estimated_minutes: 25,
            sort_order: 1,
            status: ActivityStatus.PENDING,
          }),
        );

        const r2 = await this.activitiesRepository.save(
          this.activitiesRepository.create({
            stage_id: stage.stage_id,
            title: `Práctica guiada: Ejercicio de refuerzo de ${goal.title}`,
            description: 'Resolución de problemas asistida con ejemplos prácticos.',
            type: ActivityType.REINFORCEMENT,
            origin: ActivityOrigin.AI_ADJUSTMENT,
            estimated_minutes: 30,
            sort_order: 2,
            status: ActivityStatus.PENDING,
          }),
        );

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const s1 = this.schedulesRepository.create({
          activity_id: r1.activity_id,
          version_number: 1,
          scheduled_date: tomorrowStr,
          start_time: '18:00',
          end_time: '18:25',
          reason: ScheduleReason.AI_ADJUSTMENT,
        });
        const s2 = this.schedulesRepository.create({
          activity_id: r2.activity_id,
          version_number: 1,
          scheduled_date: tomorrowStr,
          start_time: '18:30',
          end_time: '19:00',
          reason: ScheduleReason.AI_ADJUSTMENT,
        });

        await this.schedulesRepository.save([s1, s2]);
      }
    } else if (dto.proposal_type === 'time') {
      const currentDue = goal.due_date ? new Date(goal.due_date) : new Date();
      currentDue.setDate(currentDue.getDate() + 14);
      await this.updateDueDate(
        userId,
        goalId,
        currentDue.toISOString().split('T')[0],
        'Ajuste por propuesta alternativa de menor carga',
      );
    }

    return {
      message: 'Propuesta de replanificación aplicada exitosamente',
      proposal_type: dto.proposal_type,
      goal_id: goalId,
    };
  }

  // HU-31: Rechazar propuesta de replanificación (conservar plan original)
  async rejectReplanAlternative(userId: number, goalId: number): Promise<{ message: string; status: string; goal_id: number }> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    return {
      message: 'Propuesta rechazada. Se conserva la planificación original.',
      status: 'rejected',
      goal_id: goalId,
    };
  }

  // HU-37: Consultar conocimientos y temas requeridos por el objetivo
  async getGoalKnowledge(userId: number, goalId: number): Promise<GoalKnowledgeResponse> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const progressRows = await this.goalsRepository.query(
      'SELECT * FROM v_goal_progress WHERE goal_id = $1',
      [goalId],
    ).catch(() => []);
    const progressInfo = progressRows && progressRows.length > 0 ? progressRows[0] : null;
    const progressPct = progressInfo ? Number(progressInfo.progress_percentage) || 0 : 0;
    const completedRatio = Math.max(0, Math.min(progressPct / 100, 1));
    const stageNames = goal.stages?.map((s) => s.name) || [];

    return this.aiService.generateGoalKnowledge(goalId, goal.title, completedRatio, stageNames);
  }

  // HU-05, HU-38: Consultar recursos de aprendizaje del objetivo
  async getGoalResources(userId: number, goalId: number): Promise<LearningResourceItem[]> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const stageNames = goal.stages?.map((s) => s.name) || [];
    return this.aiService.generateLearningResources(goalId, goal.title, stageNames);
  }

  // HU-40: Cuestionario de evaluación diagnóstica
  async getGoalEvaluation(userId: number, goalId: number): Promise<QuizQuestionItem[]> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const stageNames = goal.stages?.map((s) => s.name) || [];
    return this.aiService.generateEvaluationQuiz(goalId, goal.title, stageNames);
  }

  // HU-40, HU-41, HU-42: Evaluar respuestas del cuestionario y sugerir refuerzo
  async submitGoalEvaluation(
    userId: number,
    goalId: number,
    dto: SubmitEvaluationDto,
  ): Promise<QuizEvaluationResult> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const hasClientGrading = dto.answers && dto.answers.some((a) => typeof a.is_correct === 'boolean');
    if (hasClientGrading) {
      let score = 0;
      const weakTopicsSet = new Set<string>();
      for (const a of dto.answers) {
        if (a.is_correct) {
          score++;
        } else {
          weakTopicsSet.add(a.category || 'General');
        }
      }
      const total = dto.answers.length || 1;
      const percentage = Math.round((score / total) * 100);
      const weak_topics = Array.from(weakTopicsSet);
      return {
        score,
        total_questions: total,
        percentage,
        weak_topics,
        reinforcement_recommendations: weak_topics.map((topic) => ({
          topic,
          suggested_title: `Refuerzo guiado: ${topic}`,
          estimated_minutes: 30,
        })),
      };
    }

    const stageNames = goal.stages?.map((s) => s.name) || [];
    const questions = await this.aiService.generateEvaluationQuiz(goalId, goal.title, stageNames);
    return this.aiService.evaluateQuizAnswers(questions, dto.answers);
  }

  // HU-42, HU-39: Agregar actividad de aprendizaje de refuerzo
  async addReinforcementActivity(
    userId: number,
    goalId: number,
    dto: AddReinforcementDto,
  ): Promise<{ message: string; activity: Activity }> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    let targetStageId = dto.stage_id;
    if (!targetStageId && goal.stages && goal.stages.length > 0) {
      targetStageId = goal.stages[0].stage_id;
    } else if (!targetStageId) {
      const firstStage = await this.stagesRepository.findOne({
        where: { goal_id: goalId },
        order: { sort_order: 'ASC' },
      });
      targetStageId = firstStage?.stage_id;
    }

    if (!targetStageId) {
      throw new BadRequestException('El objetivo no tiene etapas para incorporar la actividad');
    }

    const structuredDescription =
      dto.description ||
      `🎯 Objetivo: Afianzar conceptos y resolver dudas en "${dto.topic}".\n` +
      `• Paso 1 (10 min): Repaso conceptual y revisión de fundamentos clave de ${dto.topic}.\n` +
      `• Paso 2 (15 min): Práctica guiada con ejercicio paso a paso enfocado en las dudas detectadas.\n` +
      `• Paso 3 (5 min): Verificación de resultados y comprobación de asimilación.`;

    const activity = await this.activitiesRepository.save(
      this.activitiesRepository.create({
        stage_id: targetStageId,
        title: dto.title || `Refuerzo guiado: ${dto.topic}`,
        description: structuredDescription,
        type: ActivityType.REINFORCEMENT,
        origin: ActivityOrigin.AI_ADJUSTMENT,
        estimated_minutes: dto.estimated_minutes || 30,
        status: ActivityStatus.PENDING,
        sort_order: 99,
      }),
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const sched = this.schedulesRepository.create({
      activity_id: activity.activity_id,
      version_number: 1,
      scheduled_date: tomorrowStr,
      start_time: '18:00',
      end_time: '18:30',
      reason: ScheduleReason.AI_ADJUSTMENT,
    });
    await this.schedulesRepository.save(sched);

    return {
      message: 'Actividad de refuerzo añadida exitosamente al plan',
      activity,
    };
  }

  async remove(userId: number, goalId: number): Promise<{ message: string; goal_id: number }> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    await this.goalsRepository.softDelete({ goal_id: goalId, user_id: userId });

    return {
      message: 'Objetivo eliminado exitosamente',
      goal_id: goalId,
    };
  }
}
