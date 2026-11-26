import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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
import { LearningStoreService, ReplanProposalPlan } from '../learning/learning-store.service';
import {
  RecommendationDiagnostic,
  ReplanAlternativesResponse,
  GoalKnowledgeResponse,
  LearningResourceItem,
  QuizQuestionItem,
  PublicQuizQuestionItem,
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

const EVALUATION_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class GoalsService {
  private readonly evaluationQuizzes = new Map<
    string,
    { questions: QuizQuestionItem[]; expiresAt: number; result?: QuizEvaluationResult }
  >();

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
    private dataSource: DataSource,
    // Persistencia del Sprint 5. Opcional: sin ella se responde como antes (solo IA).
    @Optional() private learningStore?: LearningStoreService,
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

  async create(userId: number, createGoalDto: CreateGoalDto): Promise<Goal> {
    const queryRunner = this.dataSource.createQueryRunner();
    let transactionStarted = false;

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();
      transactionStarted = true;

      const goalRepository = queryRunner.manager.getRepository(Goal);
      const stagesRepository = queryRunner.manager.getRepository(Stage);
      const activitiesRepository = queryRunner.manager.getRepository(Activity);
      const schedulesRepository = queryRunner.manager.getRepository(ActivitySchedule);

      const savedGoal = await goalRepository.save(
        goalRepository.create({
          user_id: userId,
          ...createGoalDto,
        }),
      );

      const userAvailabilities = await this.availabilityService.findAllByUser(userId);
      const availabilityPreferences = await this.availabilityService.getPreferences(userId);

      let plan;
      try {
        plan = await this.aiService.generateInitialPlan(
          savedGoal.title,
          savedGoal.user_description,
          userAvailabilities,
          availabilityPreferences.session_duration_minutes,
        );
      } catch (error) {
        throw new ServiceUnavailableException(
          'No se pudo generar el plan. Inténtalo de nuevo.',
          { cause: error },
        );
      }

      if (
        !plan?.stages?.length ||
        plan.stages.some((stage) => !stage.activities?.length)
      ) {
        throw new ServiceUnavailableException(
          'No se pudo generar un plan con actividades. Inténtalo de nuevo.',
        );
      }

      const totalActivities = plan.stages.reduce(
        (total, stage) => total + (stage.activities?.length || 0),
        0,
      );
      const plannedDates = this.calculateSequentialDates(
        savedGoal.start_date,
        userAvailabilities,
        totalActivities,
      );
      let dateIndex = 0;

      for (const stageData of plan.stages) {
        const savedStage = await stagesRepository.save(
          stagesRepository.create({
            goal_id: savedGoal.goal_id,
            name: stageData.name,
            description: stageData.description,
            sort_order: stageData.sort_order,
          }),
        );

        for (const act of stageData.activities) {
          const savedActivity = await activitiesRepository.save(
            activitiesRepository.create({
              stage_id: savedStage.stage_id,
              title: act.title,
              type: Object.values(ActivityType).includes(act.type as ActivityType)
                ? (act.type as ActivityType)
                : ActivityType.LEARNING,
              estimated_minutes: act.estimated_minutes,
              sort_order: act.sort_order,
              origin: ActivityOrigin.INITIAL_PLAN,
              status: ActivityStatus.PENDING,
            }),
          );

          const scheduleInfo = plannedDates[dateIndex++];
          if (scheduleInfo) {
            await schedulesRepository.save(
              schedulesRepository.create({
                activity_id: savedActivity.activity_id,
                version_number: 1,
                scheduled_date: scheduleInfo.scheduled_date,
                start_time: scheduleInfo.start_time,
                end_time: scheduleInfo.end_time,
                reason: ScheduleReason.INITIAL_PLAN,
              }),
            );
          }
        }
      }

      const result = await goalRepository.findOne({
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
      if (!result) {
        throw new InternalServerErrorException(
          'No se pudo recuperar el plan después de guardarlo.',
        );
      }

      await queryRunner.commitTransaction();
      transactionStarted = false;
      return result;
    } catch (error) {
      if (transactionStarted) {
        try {
          await queryRunner.rollbackTransaction();
        } catch (rollbackError) {
          throw new InternalServerErrorException(
            'No se pudo completar ni revertir la creación del plan.',
            { cause: rollbackError },
          );
        }
      }

      if (error instanceof HttpException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'No se pudo guardar la meta y su plan. Inténtalo de nuevo.',
        { cause: error },
      );
    } finally {
      await queryRunner.release();
    }
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
    } else if (sortBy === 'progress') {
      sql += ' ORDER BY progress_percentage DESC NULLS LAST';
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

    // Sprint 5: se reutiliza la recomendacion pendiente de la ultima hora para no
    // generar (y guardar) una nueva en cada visita a la pantalla.
    const store = this.learningStore;
    if (store) {
      const recent = await store.safely(
        'Leer recomendacion reciente',
        () => store.findRecentRecommendation(userId, ['delay_adjustment', 'difficulty_support', 'personalized'], goalId),
        null,
      );
      if (recent) return recent.diagnostic;
    }

    const diagnostic = await this.aiService.generateRecommendationDiagnostic(
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

    // HU-30, HU-31: se guarda la recomendacion con su explicacion para tener historial.
    if (store) {
      const recommendationId = await store.safely(
        'Guardar recomendacion',
        () =>
          store.saveRecommendation({
            userId,
            goalId,
            activityId: delayInfo?.most_overdue_activity_id ? Number(delayInfo.most_overdue_activity_id) : null,
            type: delayInfo ? 'delay_adjustment' : diffInfo ? 'difficulty_support' : 'personalized',
            alertLevel: diagnostic.alert_level,
            title: diagnostic.alert_message,
            whySuggested: diagnostic.why_suggested,
            solutionFocus: diagnostic.solution_focus,
            solutions: diagnostic.solutions,
            metrics: diagnostic.metrics,
            details: {
              diagnostic: {
                goal_title: diagnostic.goal_title,
                activity_title: diagnostic.activity_title,
                max_days_late: diagnostic.max_days_late,
                alert_message: diagnostic.alert_message,
                difficulty_context: diagnostic.difficulty_context,
              },
            },
          }),
        null,
      );
      if (recommendationId) {
        return { ...diagnostic, recommendation_id: recommendationId } as RecommendationDiagnostic;
      }
    }
    return diagnostic;
  }

  // HU-43: Recomendaciones personalizadas para la pantalla de inicio
  async getPersonalizedRecommendations(userId: number): Promise<RecommendationDiagnostic> {
    // HU-43: la base sugiere sobre que objetivo actuar segun el progreso
    // (retraso, temas por reforzar o el objetivo activo prioritario).
    const store = this.learningStore;
    if (store) {
      const focusGoalId = await store.safely('Leer foco del usuario', () => store.focusGoalId(userId), null);
      if (focusGoalId) {
        const focusGoal = await this.findOneByUser(userId, focusGoalId);
        if (focusGoal) return this.getGoalRecommendations(userId, focusGoalId);
      }
    }

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

    const template = await this.aiService.generateReplanAlternatives(
      goalId,
      goal.title,
      progressPercentage,
      completedCount,
      completedHours,
      pendingActivitiesCount,
    );

    const store = this.learningStore;
    if (!store) return template;

    // Sprint 5: las propuestas del dia se guardan con el detalle de cada cambio
    // (REPLAN_PROPOSAL / REPLAN_PROPOSAL_ITEM) para aplicarlas tal como se mostraron.
    const stored = await store.safely(
      'Guardar propuestas de replanificacion',
      async () =>
        (await store.loadTodayReplan(userId, goalId)) ??
        store.saveReplan(await this.buildReplanPlans(userId, goal, template)),
      null,
    );
    if (!stored) return template;
    return { ...template, recommendation_id: stored.recommendation_id, proposals: stored.proposals } as ReplanAlternativesResponse;
  }

  // HU-27, HU-28, HU-29, HU-08: detalle real de cada alternativa.
  //   balanced -> reprograma las actividades pendientes en las proximas franjas de disponibilidad
  //   learning -> agrega dos actividades de refuerzo para manana
  //   time     -> extiende 14 dias la fecha limite (desde hoy si ya vencio)
  // Las actividades completadas no se tocan: la base lo impide (HU-29).
  private async buildReplanPlans(userId: number, goal: Goal, template: ReplanAlternativesResponse) {
    const store = this.learningStore!;
    const today = await store.today();
    const addDays = (date: string, days: number) => {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10);
    };

    const pending = await this.activitiesRepository
      .createQueryBuilder('activity')
      .innerJoin('activity.stage', 'stage')
      .where('stage.goal_id = :goalId', { goalId: goal.goal_id })
      .andWhere('activity.status IN (:...open)', { open: [ActivityStatus.PENDING, ActivityStatus.IN_PROGRESS] })
      .orderBy('stage.sort_order', 'ASC')
      .addOrderBy('activity.sort_order', 'ASC')
      .getMany();
    const availabilities = await this.availabilityService.findAllByUser(userId);
    const slots = this.calculateSequentialDates(`${today}T00:00:00`, availabilities, pending.length);

    const balancedItems = pending.map((activity, i) => ({
      action: 'reschedule' as const,
      activity_id: activity.activity_id,
      new_scheduled_date: slots[i]?.scheduled_date ?? addDays(today, i),
      new_start_time: slots[i]?.start_time ?? '18:00',
      new_end_time: slots[i]?.end_time ?? '19:00',
    }));
    const tomorrow = addDays(today, 1);
    const learningItems = [
      { title: `Refuerzo guiado: Conceptos clave de ${goal.title}`, minutes: 25, start: '18:00', end: '18:25' },
      { title: `Práctica guiada: Ejercicio de refuerzo de ${goal.title}`, minutes: 30, start: '18:30', end: '19:00' },
    ].map((r) => ({
      action: 'add' as const,
      new_title: r.title,
      estimated_minutes: r.minutes,
      new_scheduled_date: tomorrow,
      new_start_time: r.start,
      new_end_time: r.end,
    }));
    // TypeORM entrega las columnas DATE como 'YYYY-MM-DD'; se contempla tambien un Date.
    const rawDue: unknown = goal.due_date;
    const dueStr = rawDue instanceof Date
      ? `${rawDue.getFullYear()}-${String(rawDue.getMonth() + 1).padStart(2, '0')}-${String(rawDue.getDate()).padStart(2, '0')}`
      : rawDue ? String(rawDue).slice(0, 10) : null;
    const baseDue = dueStr && dueStr > today ? dueStr : today;
    const newDueDate = addDays(baseDue, 14);

    const plans: ReplanProposalPlan[] = template.proposals.map((proposal) => {
      if (proposal.type === 'balanced') {
        const moved = balancedItems.length;
        return {
          proposal: {
            ...proposal,
            rescheduled_count: moved,
            description: moved
              ? `Mueve ${moved} ${moved === 1 ? 'actividad' : 'actividades'} a tus próximas franjas libres y mantiene la fecha límite.`
              : 'No hay actividades pendientes por mover; se mantiene la fecha límite.',
          },
          items: balancedItems,
        };
      }
      if (proposal.type === 'learning') {
        return { proposal: { ...proposal, added_resources_count: learningItems.length }, items: learningItems };
      }
      return { proposal, items: [], new_due_date: newDueDate };
    });

    const [context] = await this.goalsRepository
      .query('SELECT * FROM v_goal_replan_context WHERE goal_id = $1', [goal.goal_id])
      .catch(() => []);
    const capacityText: Record<string, string> = {
      fits: 'la carga pendiente cabe en tu disponibilidad semanal',
      overloaded: 'la carga pendiente supera tu disponibilidad semanal',
      no_availability: 'todavía no registraste tu disponibilidad semanal',
      deadline_passed: 'la fecha límite ya pasó',
      nothing_pending: 'no quedan actividades pendientes',
    };
    const whySuggested = context
      ? `Llevas ${Math.round(Number(context.progress_percentage) || 0)}% de avance y tus ${context.completed_activities} actividades completadas se conservan. ` +
        `Quedan ${context.pending_activities} pendientes (${context.overdue_activities} vencidas) y ${capacityText[context.capacity_status] ?? 'conviene revisar tu plan'}.`
      : `Propuestas para reorganizar el plan de "${goal.title}" conservando lo que ya completaste.`;

    return {
      userId,
      goalId: goal.goal_id,
      whySuggested,
      metrics: {
        progress_percentage: template.current_progress_percentage,
        completed_count: template.completed_count,
        completed_hours: template.completed_hours,
        pending_activities: pending.length,
        weekly_available_minutes: context ? Number(context.weekly_available_minutes) : null,
        capacity_status: context?.capacity_status ?? null,
      },
      plans,
    };
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

    const store = this.learningStore;
    if (!store) return this.applyReplanLegacy(userId, goalId, dto, goal);

    try {
      // Si el usuario no abrio hoy las alternativas, se generan y guardan primero.
      const hasProposal = await store.transaction((m) =>
        store.loadProposalForApply(m, userId, goalId, dto.proposal_type),
      );
      if (!hasProposal) await this.getReplanAlternatives(userId, goalId);

      return await store.transaction(async (m) => {
        const selected = await store.loadProposalForApply(m, userId, goalId, dto.proposal_type);
        if (!selected) {
          throw new BadRequestException('No hay una propuesta de replanificación disponible para aplicar');
        }

        if (selected.proposal_type === 'balanced') {
          for (const item of selected.items.filter((i) => i.action === 'reschedule' && i.activity_id)) {
            // Solo se reprograma lo que sigue pendiente (HU-29).
            await m.query(
              `INSERT INTO "ACTIVITY_SCHEDULE"
                 (activity_id, recommendation_id, version_number, scheduled_date, start_time, end_time, reason)
               SELECT a.activity_id, $2,
                      COALESCE((SELECT MAX(version_number) FROM "ACTIVITY_SCHEDULE" WHERE activity_id = a.activity_id), 0) + 1,
                      $3, $4, $5, 'ai_adjustment'
                 FROM "ACTIVITY" a
                WHERE a.activity_id = $1 AND a.deleted_at IS NULL AND a.status IN ('pending', 'in_progress')`,
              [item.activity_id, selected.recommendation_id, item.new_scheduled_date, item.new_start_time, item.new_end_time],
            );
          }
        } else if (selected.proposal_type === 'learning') {
          const [stage] = await m.query(
            'SELECT stage_id FROM "STAGE" WHERE goal_id = $1 ORDER BY sort_order, stage_id LIMIT 1',
            [goalId],
          );
          if (!stage) throw new BadRequestException('El objetivo no tiene etapas para incorporar el refuerzo');
          const descriptions = [
            'Lectura y síntesis recomendada por IA para afianzar conceptos.',
            'Resolución de problemas asistida con ejemplos prácticos.',
          ];
          const added = selected.items.filter((i) => i.action === 'add');
          for (const [index, item] of added.entries()) {
            const [activity] = await m.query(
              `INSERT INTO "ACTIVITY"
                 (stage_id, origin_recommendation_id, title, description, type, origin,
                  estimated_minutes, sort_order, status)
               VALUES ($1, $2, $3, $4, 'reinforcement', 'ai_adjustment', $5, $6, 'pending')
               RETURNING activity_id`,
              [stage.stage_id, selected.recommendation_id, item.new_title, descriptions[index] ?? null,
               item.estimated_minutes ?? 30, index + 1],
            );
            await m.query(
              `INSERT INTO "ACTIVITY_SCHEDULE"
                 (activity_id, recommendation_id, version_number, scheduled_date, start_time, end_time, reason)
               VALUES ($1, $2, 1, $3, $4, $5, 'ai_adjustment')`,
              [activity.activity_id, selected.recommendation_id, item.new_scheduled_date, item.new_start_time, item.new_end_time],
            );
          }
        } else if (selected.proposal_type === 'time' && selected.new_due_date) {
          // HU-08 / HU-34: el trigger valida la fecha y guarda el historial con este motivo.
          await m.query("SELECT set_config('flowstep.change_reason', $1, true)", [
            'Ajuste por propuesta alternativa de menor carga',
          ]);
          await m.query('UPDATE "GOAL" SET due_date = $1 WHERE goal_id = $2 AND user_id = $3', [
            selected.new_due_date,
            goalId,
            userId,
          ]);
        }

        // HU-52: el trigger acepta la recomendacion y descarta las otras propuestas.
        await store.markProposalSelected(m, selected.proposal_id);
        return {
          message: 'Propuesta de replanificación aplicada exitosamente',
          proposal_type: dto.proposal_type,
          goal_id: goalId,
          recommendation_id: selected.recommendation_id,
          proposal_id: selected.proposal_id,
        };
      });
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) throw err;
      if (err?.code === '23514') {
        throw new BadRequestException(err?.message || 'La propuesta no se puede aplicar');
      }
      // Base sin las tablas del Sprint 5: se aplica como antes.
      return this.applyReplanLegacy(userId, goalId, dto, goal);
    }
  }

  private async applyReplanLegacy(
    userId: number,
    goalId: number,
    dto: ApplyAlternativeDto,
    goal: Goal,
  ): Promise<{ message: string; proposal_type: string; goal_id: number }> {
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
      // Si la fecha limite ya vencio se extiende desde hoy, para no proponer una fecha pasada.
      const due = goal.due_date ? new Date(goal.due_date) : new Date();
      const currentDue = due.getTime() > Date.now() ? due : new Date();
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

    // HU-31: la decision queda registrada (las propuestas pasan a descartadas por trigger).
    const store = this.learningStore;
    const rejected = store
      ? await store.safely('Rechazar propuestas', () => store.rejectPendingReplan(userId, goalId), [] as number[])
      : [];

    return {
      message: 'Propuesta rechazada. Se conserva la planificación original.',
      status: 'rejected',
      goal_id: goalId,
      ...(rejected.length ? { rejected_recommendation_ids: rejected } : {}),
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

    // Sprint 5: los conocimientos se generan una vez y quedan en TOPIC / GOAL_TOPIC;
    // desde ahi su estado se calcula con el avance real (v_goal_knowledge).
    const store = this.learningStore;
    if (store) {
      const saved = await store.safely('Leer conocimientos', () => store.loadGoalKnowledge(goalId, goal.title), null);
      if (saved) return saved;
    }

    const generated = await this.aiService.generateGoalKnowledge(goalId, goal.title, completedRatio, stageNames);
    if (!store) return generated;
    const stored = await store.safely(
      'Guardar conocimientos',
      async () => {
        await store.saveGoalKnowledge(goalId, generated, (goal.stages || []).map((s) => ({ stage_id: s.stage_id, name: s.name })));
        return store.loadGoalKnowledge(goalId, goal.title);
      },
      null,
    );
    return stored ?? generated;
  }

  // HU-05, HU-38: Consultar recursos de aprendizaje del objetivo
  async getGoalResources(userId: number, goalId: number): Promise<LearningResourceItem[]> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const stageNames = goal.stages?.map((s) => s.name) || [];

    // Sprint 5: los recursos se generan una vez y quedan en LEARNING_RESOURCE.
    const store = this.learningStore;
    if (store) {
      // Solo se reutiliza si el objetivo ya tiene su lista propia; los recursos que
      // vienen de una actividad no reemplazan a los del objetivo.
      const saved = await store.safely(
        'Leer recursos',
        async () => ((await store.hasGoalResources(goalId)) ? store.loadGoalResources(goalId) : []),
        [] as LearningResourceItem[],
      );
      if (saved.length) return saved;
    }

    const generated = await this.aiService.generateLearningResources(goalId, goal.title, stageNames);
    if (!store) return generated;
    const stored = await store.safely(
      'Guardar recursos',
      async () => {
        await store.saveGoalResources(goalId, generated);
        return store.loadGoalResources(goalId);
      },
      [] as LearningResourceItem[],
    );
    return stored.length ? stored : generated;
  }

  // HU-40: Cuestionario de evaluación diagnóstica
  async getGoalEvaluation(
    userId: number,
    goalId: number,
  ): Promise<PublicQuizQuestionItem[]> {
    const goal = await this.findOneByUser(userId, goalId);
    if (!goal) {
      throw new NotFoundException(`Objetivo con ID ${goalId} no encontrado`);
    }

    const stageNames = goal.stages?.map((s) => s.name) || [];

    // Sprint 5: el cuestionario se guarda en la base (ASSESSMENT) para calificar contra
    // las mismas preguntas aunque el backend se reinicie; si hay uno sin responder
    // (ultimos 7 dias) se reutiliza. Nunca se envian las respuestas correctas a la app.
    const store = this.learningStore;
    if (store) {
      const open = await store.safely('Leer evaluacion abierta', () => store.loadOpenAssessment(goalId, userId), null);
      if (open) return this.toPublicQuiz(open);
    }

    const questions = await this.aiService.generateEvaluationQuiz(
      goalId,
      goal.title,
      stageNames,
    );

    if (store) {
      const stored = await store.safely(
        'Guardar evaluacion',
        () => store.saveAssessment(goalId, questions),
        [] as QuizQuestionItem[],
      );
      if (stored.length) return this.toPublicQuiz(stored);
    }

    // Respaldo sin las tablas del Sprint 5: el cuestionario se guarda en memoria.
    const now = Date.now();
    for (const [key, quiz] of this.evaluationQuizzes) {
      if (quiz.expiresAt <= now) {
        this.evaluationQuizzes.delete(key);
      }
    }

    this.evaluationQuizzes.set(this.evaluationKey(userId, goalId), {
      questions,
      expiresAt: now + EVALUATION_TTL_MS,
    });

    return this.toPublicQuiz(questions);
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

    // Una pregunta no puede responderse dos veces en el mismo envio.
    const answeredIds = dto.answers.map((answer) => answer.question_id);
    if (new Set(answeredIds).size !== answeredIds.length) {
      throw new BadRequestException('Las respuestas no corresponden a esta evaluación.');
    }

    // Sprint 5: si las preguntas son de un cuestionario guardado, se califica en el
    // servidor contra las opciones guardadas, se guarda el intento y se actualiza el
    // dominio por tema (HU-41). Un segundo envio del mismo cuestionario devuelve el
    // mismo resultado.
    const store = this.learningStore;
    if (store) {
      const graded = await store.safely('Calificar evaluacion', () => store.gradeSubmission(userId, goalId, dto.answers), null);
      if (graded) return graded;
    }

    const quizKey = this.evaluationKey(userId, goalId);
    const quiz = this.evaluationQuizzes.get(quizKey);
    if (!quiz || quiz.expiresAt <= Date.now()) {
      this.evaluationQuizzes.delete(quizKey);
      throw new BadRequestException(
        'La evaluación expiró o no está disponible. Vuelve a cargar las preguntas.',
      );
    }
    if (quiz.result) {
      return quiz.result;
    }

    const questionIds = new Set(quiz.questions.map(({ id }) => id));
    const submittedIds = new Set<number>();
    const answers = dto.answers.map((answer) => {
      if (!questionIds.has(answer.question_id) || submittedIds.has(answer.question_id)) {
        throw new BadRequestException(
          'Las respuestas no corresponden a esta evaluación.',
        );
      }
      submittedIds.add(answer.question_id);
      return {
        question_id: answer.question_id,
        selected_option: answer.selected_option || answer.selected_option_id || '',
      };
    });

    const result = this.aiService.evaluateQuizAnswers(quiz.questions, answers);
    quiz.result = result;
    return result;
  }

  private evaluationKey(userId: number, goalId: number): string {
    return `${userId}:${goalId}`;
  }

  // Version publica del cuestionario: sin la respuesta correcta ni la explicacion.
  private toPublicQuiz(questions: QuizQuestionItem[]): PublicQuizQuestionItem[] {
    return questions.map(({ id, category, question, options }) => ({
      id,
      category,
      question,
      options: options.map(({ key, text }) => ({ key, text })),
    }));
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

    // HU-42: se vincula al tema reforzado y a la recomendacion aceptada que la origino.
    const store = this.learningStore;
    if (store) {
      const recommendationId = await store.safely(
        'Registrar refuerzo',
        () => store.recordReinforcement(userId, goalId, activity.activity_id, dto.topic),
        null,
      );
      if (recommendationId) activity.origin_recommendation_id = recommendationId;
    }

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
