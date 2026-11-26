import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository, IsNull, Not } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Goal } from '../goals/entities/goal.entity';
import { ActivitySchedule } from './entities/activity-schedule.entity';
import { ActivityStatusHistory } from './entities/activity-status-history.entity';
import { WorkSession } from './entities/work-session.entity';
import { MissReason } from './entities/miss-reason.entity';
import { ScheduleMiss } from './entities/schedule-miss.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { RecordActivityMissDto } from './dto/record-activity-miss.dto';
import { ActivityHistoryFilterDto } from './dto/activity-history-filter.dto';
import { CalendarQueryDto } from './dto/calendar-query.dto';
import { ActivityOrigin, ActivityStatus } from './enums/activity.enum';
import { PriorityLevel, GoalStatus } from '../goals/enums/goal.enum';
import { ScheduleReason } from './enums/schedule-reason.enum';
import { getAppDateString } from '../common/utils/date.utils';
import { AiService, LearningResourceItem } from '../ai/ai.service';
import { LearningStoreService } from '../learning/learning-store.service';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    @InjectRepository(Stage)
    private stagesRepository: Repository<Stage>,
    @InjectRepository(ActivitySchedule)
    private schedulesRepository: Repository<ActivitySchedule>,
    @InjectRepository(WorkSession)
    private workSessionsRepository: Repository<WorkSession>,
    @InjectRepository(MissReason)
    private missReasonsRepository: Repository<MissReason>,
    @InjectRepository(ScheduleMiss)
    private scheduleMissesRepository: Repository<ScheduleMiss>,
    private aiService: AiService,
    // Persistencia del Sprint 5. Opcional: sin ella se responde como antes (solo IA).
    @Optional() private learningStore?: LearningStoreService,
  ) {}

  private findOwnedActivity(
    userId: number,
    activityId: number,
    relations?: FindOptionsRelations<Activity>,
  ): Promise<Activity | null> {
    return this.activitiesRepository.findOne({
      where: {
        activity_id: activityId,
        stage: { goal: { user_id: userId } },
      },
      relations,
    });
  }

  async createForStage(userId: number, stageId: number, dto: CreateActivityDto): Promise<Activity> {
    const stage = await this.stagesRepository.findOne({
      where: { stage_id: stageId, goal: { user_id: userId } },
      relations: { activities: true },
    });

    if (!stage) {
      throw new NotFoundException(`La etapa con ID ${stageId} no existe`);
    }

    const maxOrder = stage.activities?.length
      ? Math.max(...stage.activities.map((a) => a.sort_order || 0))
      : 0;

    if (dto.parent_activity_id != null) {
      const parent = await this.activitiesRepository.findOne({
        where: {
          activity_id: dto.parent_activity_id,
          stage_id: stageId,
          stage: { goal: { user_id: userId } },
        },
      });
      if (!parent) {
        throw new NotFoundException(
          `La actividad padre con ID ${dto.parent_activity_id} no existe en esta etapa`,
        );
      }
    }

    const activity = this.activitiesRepository.create({
      stage_id: stageId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      priority: dto.priority || PriorityLevel.MEDIUM,
      estimated_minutes: dto.estimated_minutes,
      parent_activity_id: dto.parent_activity_id,
      origin: ActivityOrigin.MANUAL, // HU-13: Creada manualmente por el usuario
      status: ActivityStatus.PENDING,
      sort_order: maxOrder + 1,
    });

    return this.activitiesRepository.save(activity);
  }

  async findById(userId: number, activityId: number): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: {
        activity_id: activityId,
        stage: { goal: { user_id: userId } },
      },
      relations: {
        stage: true,
        sub_activities: true,
        schedules: true,
      },
      order: {
        schedules: {
          version_number: 'ASC',
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    return activity;
  }

  async update(userId: number, activityId: number, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findOwnedActivity(userId, activityId, { stage: true });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    if (dto.parent_activity_id != null && dto.parent_activity_id !== activity.activity_id) {
      const parent = await this.activitiesRepository.findOne({
        where: {
          activity_id: dto.parent_activity_id,
          stage_id: activity.stage_id,
          stage: { goal: { user_id: userId } },
        },
      });
      if (!parent) {
        throw new NotFoundException(
          `La actividad padre con ID ${dto.parent_activity_id} no existe en esta etapa`,
        );
      }
    } else if (dto.parent_activity_id === activity.activity_id) {
      throw new BadRequestException('Una actividad no puede ser su propia actividad padre');
    }

    const previousStatus = activity.status;
    if (dto.status !== undefined && dto.status !== previousStatus) {
      return this.activitiesRepository.manager.transaction(async (manager) => {
        const activityRepository = manager.getRepository(Activity);
        const historyRepository = manager.getRepository(ActivityStatusHistory);
        const current = await activityRepository.findOne({
          where: {
            activity_id: activityId,
            stage: { goal: { user_id: userId } },
          },
        });
        if (!current) {
          throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
        }

        if (current.status === dto.status) {
          Object.assign(current, dto);
          return activityRepository.save(current);
        }

        await historyRepository.save(
          historyRepository.create({
            activity_id: activityId,
            previous_status: current.status,
            new_status: dto.status,
            previous_completed_at: current.completed_at,
          }),
        );
        Object.assign(current, dto);
        current.completed_at =
          dto.status === ActivityStatus.COMPLETED ? new Date() : null;
        return activityRepository.save(current);
      });
    }

    Object.assign(activity, dto);
    return this.activitiesRepository.save(activity);
  }

  async completeActivity(userId: number, activityId: number): Promise<Activity> {
    return this.changeStatus(userId, activityId, ActivityStatus.COMPLETED);
  }

  async markAsPending(userId: number, activityId: number): Promise<Activity> {
    return this.changeStatus(userId, activityId, ActivityStatus.PENDING);
  }

  private async changeStatus(
    userId: number,
    activityId: number,
    newStatus: ActivityStatus,
  ): Promise<Activity> {
    return this.activitiesRepository.manager.transaction(async (manager) => {
      const activityRepository = manager.getRepository(Activity);
      const historyRepository = manager.getRepository(ActivityStatusHistory);
      const activity = await activityRepository.findOne({
        where: {
          activity_id: activityId,
          stage: { goal: { user_id: userId } },
        },
        relations: { stage: { goal: true } },
      });

      if (!activity) {
        throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
      }

      if (activity.status === newStatus) {
        return activity;
      }

      const previousStatus = activity.status;
      const previousCompletedAt = activity.completed_at;
      await historyRepository.save(
        historyRepository.create({
          activity_id: activityId,
          previous_status: previousStatus,
          new_status: newStatus,
          previous_completed_at: previousCompletedAt,
        }),
      );

      activity.status = newStatus;
      activity.completed_at =
        newStatus === ActivityStatus.COMPLETED ? new Date() : null;

      const savedActivity = await activityRepository.save(activity);

      // Sincronizar automáticamente el estado del objetivo (completado o reactivado)
      if (activity.stage?.goal) {
        const goalId = activity.stage.goal.goal_id;
        const counts = await manager.query(
          `SELECT 
             COUNT(a.activity_id)::integer AS total_count,
             COUNT(CASE WHEN a.status != 'completed' THEN 1 END)::integer AS pending_count
           FROM "ACTIVITY" a
           JOIN "STAGE" s ON s.stage_id = a.stage_id
           WHERE s.goal_id = $1
             AND a.deleted_at IS NULL`,
          [goalId],
        );

        const totalCount = Number(counts[0]?.total_count || 0);
        const pendingCount = Number(counts[0]?.pending_count || 0);

        if (totalCount > 0 && pendingCount === 0) {
          await manager.query(
            `UPDATE "GOAL" SET status = 'completed' WHERE goal_id = $1 AND status = 'active'`,
            [goalId],
          );
        } else if (pendingCount > 0) {
          await manager.query(
            `UPDATE "GOAL" SET status = 'active' WHERE goal_id = $1 AND status = 'completed'`,
            [goalId],
          );
        }
      }

      return savedActivity;
    });
  }

  async remove(userId: number, activityId: number, reason?: string): Promise<{ message: string }> {
    const activity = await this.findOwnedActivity(userId, activityId);

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    // Borrado lógico con registro de motivo (trigger trg_activity_soft_delete propaga en cascada)
    await this.activitiesRepository.query(
      'UPDATE "ACTIVITY" SET deleted_at = CURRENT_TIMESTAMP, deletion_reason = $1 WHERE activity_id = $2',
      [reason || 'Eliminada por el usuario', activityId],
    );
    return { message: `Actividad con ID ${activityId} eliminada correctamente` };
  }

  // HU-50: Planificación en calendario (v_calendar_day_summary y v_calendar_activities)
  async getCalendar(userId: number, query: CalendarQueryDto): Promise<any> {
    const now = new Date();
    const currentYear = query.year || now.getFullYear();
    const currentMonth = query.month || (now.getMonth() + 1);

    let startStr: string;
    let endStr: string;

    if (query.date) {
      startStr = query.date;
      endStr = query.date;
    } else if (query.startDate && query.endDate) {
      startStr = query.startDate;
      endStr = query.endDate;
    } else {
      const firstDay = new Date(currentYear, currentMonth - 1, 1);
      const lastDay = new Date(currentYear, currentMonth, 0);
      const pad = (n: number) => String(n).padStart(2, '0');
      startStr = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
      endStr = `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}`;
    }

    const [days, activities] = await Promise.all([
      this.activitiesRepository.query(
        'SELECT v.*, (v.scheduled_date)::text AS scheduled_date, (v.scheduled_date)::text AS scheduled_date_str FROM v_calendar_day_summary v WHERE v.user_id = $1 AND v.scheduled_date BETWEEN $2 AND $3 ORDER BY v.scheduled_date ASC',
        [userId, startStr, endStr],
      ),
      this.activitiesRepository.query(
        'SELECT v.*, (v.scheduled_date)::text AS scheduled_date, (v.scheduled_date)::text AS scheduled_date_str, v.activity_title AS title, v.activity_status AS status FROM v_calendar_activities v WHERE v.user_id = $1 AND v.scheduled_date BETWEEN $2 AND $3 ORDER BY v.scheduled_date ASC, v.start_time NULLS LAST',
        [userId, startStr, endStr],
      ),
    ]);

    return {
      period_start: startStr,
      period_end: endStr,
      month: currentMonth,
      year: currentYear,
      days,
      activities,
    };
  }

  async reschedule(
    userId: number,
    activityId: number,
    dto: RescheduleActivityDto,
  ): Promise<ActivitySchedule> {
    const activity = await this.findOwnedActivity(userId, activityId);

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    if (
      dto.start_time &&
      dto.end_time &&
      this.timeToSeconds(dto.start_time) >= this.timeToSeconds(dto.end_time)
    ) {
      throw new BadRequestException(
        `La hora de fin (${dto.end_time}) debe ser posterior a la hora de inicio (${dto.start_time})`,
      );
    }

    // Obtener la última versión del cronograma (HU-14: No se pierde el estado/fecha anterior)
    const lastSchedule = await this.schedulesRepository.findOne({
      where: { activity_id: activityId },
      order: { version_number: 'DESC' },
    });

    const nextVersion = lastSchedule ? lastSchedule.version_number + 1 : 1;

    const newSchedule = this.schedulesRepository.create({
      activity_id: activityId,
      version_number: nextVersion,
      scheduled_date: dto.scheduled_date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      reason: ScheduleReason.USER_RESCHEDULE,
    });

    return this.schedulesRepository.save(newSchedule);
  }

  async getScheduleHistory(userId: number, activityId: number): Promise<ActivitySchedule[]> {
    const activity = await this.findOwnedActivity(userId, activityId);

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    return this.schedulesRepository.find({
      where: { activity_id: activityId },
      order: { version_number: 'ASC' },
    });
  }

  async logWorkSession(
    userId: number,
    activityId: number,
    dto: CreateWorkSessionDto,
  ): Promise<WorkSession> {
    const activity = await this.findOwnedActivity(userId, activityId);
    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    const sessionDate = getAppDateString(dto.session_date);

    const workSession = this.workSessionsRepository.create({
      activity_id: activityId,
      minutes_spent: dto.minutes_spent,
      session_date: sessionDate,
      difficulty_level: dto.difficulty_level ?? null,
      difficulty_notes: dto.difficulty_notes ?? null,
    });

    return this.workSessionsRepository.save(workSession);
  }

  async getWorkSessions(
    userId: number,
    activityId: number,
  ): Promise<{
    activity_id: number;
    activity_title: string;
    estimated_minutes: number;
    total_logged_minutes: number;
    sessions: WorkSession[];
  }> {
    const activity = await this.findOwnedActivity(userId, activityId);
    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    const sessions = await this.workSessionsRepository.find({
      where: { activity_id: activityId },
      order: { session_date: 'DESC', created_at: 'DESC' },
    });

    const totalLoggedMinutes = sessions.reduce(
      (acc, s) => acc + (s.minutes_spent || 0),
      0,
    );

    return {
      activity_id: activity.activity_id,
      activity_title: activity.title,
      estimated_minutes: activity.estimated_minutes || 0,
      total_logged_minutes: totalLoggedMinutes,
      sessions,
    };
  }

  async getMissReasons(): Promise<MissReason[]> {
    return this.missReasonsRepository.find({
      order: { reason_id: 'ASC' },
    });
  }

  async recordMiss(
    userId: number,
    activityId: number,
    dto: RecordActivityMissDto,
  ): Promise<ScheduleMiss> {
    const activity = await this.findOwnedActivity(userId, activityId);
    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    const reason = await this.missReasonsRepository.findOne({
      where: { reason_id: dto.reason_id },
    });
    if (!reason) {
      throw new BadRequestException('El motivo de incumplimiento seleccionado no es válido');
    }

    let schedule: ActivitySchedule | null = null;
    if (dto.schedule_id) {
      schedule = await this.schedulesRepository.findOne({
        where: { schedule_id: dto.schedule_id, activity_id: activityId },
      });
      if (!schedule) {
        throw new NotFoundException(
          `La versión de programación con ID ${dto.schedule_id} no pertenece a esta actividad`,
        );
      }
    } else {
      schedule = await this.schedulesRepository.findOne({
        where: { activity_id: activityId },
        order: { version_number: 'DESC' },
      });
      if (!schedule) {
        throw new BadRequestException(
          'La actividad no cuenta con una programación en el cronograma para registrar un incumplimiento',
        );
      }
    }

    const existingMiss = await this.scheduleMissesRepository.findOne({
      where: { schedule_id: schedule.schedule_id },
    });
    if (existingMiss) {
      throw new BadRequestException(
        'Ya se ha registrado una incidencia de incumplimiento para esta versión de programación',
      );
    }

    const miss = this.scheduleMissesRepository.create({
      schedule_id: schedule.schedule_id,
      reason_id: dto.reason_id,
      details: dto.details || null,
    });

    const savedMiss = await this.scheduleMissesRepository.save(miss);
    savedMiss.reason = reason;
    return savedMiss;
  }

  async getActivityMisses(userId: number, activityId: number): Promise<ScheduleMiss[]> {
    const activity = await this.findOwnedActivity(userId, activityId);
    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    return this.scheduleMissesRepository.find({
      where: { schedule: { activity_id: activityId } },
      relations: { reason: true, schedule: true },
      order: { recorded_at: 'DESC' },
    });
  }

  async getActivityTimeline(
    userId: number,
    filters?: ActivityHistoryFilterDto,
  ): Promise<any[]> {
    const params: any[] = [userId];
    let query = 'SELECT * FROM v_activity_timeline WHERE user_id = $1';

    if (filters?.goal_id != null) {
      params.push(filters.goal_id);
      query += ` AND goal_id = $${params.length}`;
    }

    if (filters?.activity_id != null) {
      params.push(filters.activity_id);
      query += ` AND activity_id = $${params.length}`;
    }

    if (filters?.event_type) {
      params.push(filters.event_type);
      query += ` AND event_type = $${params.length}`;
    }

    if (filters?.from && filters?.to) {
      const fromDate = getAppDateString(filters.from);
      const toDate = getAppDateString(filters.to);
      if (fromDate > toDate) {
        throw new BadRequestException(
          `El rango de fechas es inválido: la fecha inicial (from: ${filters.from}) no puede ser posterior a la fecha final (to: ${filters.to})`,
        );
      }
    }

    if (filters?.from) {
      const fromDate = getAppDateString(filters.from);
      params.push(fromDate);
      query += ` AND event_date >= $${params.length}`;
    }

    if (filters?.to) {
      const toDate = getAppDateString(filters.to);
      params.push(toDate);
      query += ` AND event_date <= $${params.length}`;
    }

    query += ' ORDER BY recorded_at DESC, event_date DESC';

    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 50;
    const offset = filters?.offset && filters.offset >= 0 ? filters.offset : 0;

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    return this.activitiesRepository.query(query, params);
  }

  async getActivityHistoryById(userId: number, activityId: number): Promise<any[]> {
    const activity = await this.findOwnedActivity(userId, activityId);
    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    return this.getActivityTimeline(userId, { activity_id: activityId });
  }

  async getActivitySuggestions(userId: number, activityId: number) {
    const activity = await this.activitiesRepository.findOne({
      where: {
        activity_id: activityId,
        stage: { goal: { user_id: userId } },
      },
      relations: {
        stage: { goal: true },
        work_sessions: true,
        schedules: { miss: { reason: true } },
      },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    const notes: string[] = [];
    if (activity.work_sessions?.length) {
      for (const s of activity.work_sessions) {
        if (s.difficulty_notes) notes.push(s.difficulty_notes);
      }
    }
    if (activity.schedules?.length) {
      for (const sched of activity.schedules) {
        if (sched.miss) {
          const reason = sched.miss.reason?.name ? `[${sched.miss.reason.name}] ` : '';
          if (sched.miss.details || reason) {
            notes.push(`${reason}${sched.miss.details || ''}`.trim());
          }
        }
      }
    }

    const difficultyText = notes.length ? notes.join('; ') : undefined;
    const goalId = activity.stage.goal.goal_id;
    const base = {
      activity_id: activity.activity_id,
      activity_title: activity.title,
      goal_id: goalId,
      goal_title: activity.stage.goal.title,
      difficulty_detected: difficultyText || null,
    };

    // Sprint 5: la sugerencia se guarda como recomendacion (HU-26, HU-30) y se
    // reutiliza durante una hora para no generar una nueva en cada visita.
    const store = this.learningStore;
    if (store) {
      const recent = await store.safely(
        'Leer sugerencia reciente',
        () => store.findRecentRecommendation(userId, ['difficulty_support'], goalId, activity.activity_id),
        null,
      );
      if (recent?.details?.suggestion) {
        return {
          ...base,
          suggestion: recent.details.suggestion,
          alternative_actions: recent.details.alternative_actions ?? [],
          recommendation_id: recent.recommendation_id,
        };
      }
    }

    const aiResult = await this.aiService.generateActivitySuggestion(
      activity.title,
      difficultyText,
    );

    const recommendationId = store
      ? await store.safely(
          'Guardar sugerencia',
          () =>
            store.saveRecommendation({
              userId,
              goalId,
              activityId: activity.activity_id,
              type: 'difficulty_support',
              alertLevel: difficultyText ? 'warning' : 'info',
              title: `Apoyo para "${activity.title}"`,
              whySuggested: difficultyText
                ? `Registraste estas dificultades: ${difficultyText}`
                : 'No hay dificultades registradas; es una sugerencia preventiva para avanzar con la actividad.',
              solutionFocus: aiResult.suggestion,
              solutions: aiResult.alternative_actions,
              details: {
                suggestion: aiResult.suggestion,
                alternative_actions: aiResult.alternative_actions,
                difficulty_detected: difficultyText || null,
              },
            }),
          null,
        )
      : null;

    return {
      ...base,
      suggestion: aiResult.suggestion,
      alternative_actions: aiResult.alternative_actions,
      ...(recommendationId ? { recommendation_id: recommendationId } : {}),
    };
  }

  async getActivityResources(userId: number, activityId: number) {
    const activity = await this.activitiesRepository.findOne({
      where: {
        activity_id: activityId,
        stage: { goal: { user_id: userId } },
      },
      relations: {
        stage: { goal: true },
      },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    // Sprint 5: los recursos de la actividad se generan una vez y quedan guardados
    // (LEARNING_RESOURCE + ACTIVITY_RESOURCE); tambien se incluyen los de sus temas.
    const store = this.learningStore;
    let resources: LearningResourceItem[] = store
      ? await store.safely('Leer recursos de la actividad', () => store.loadActivityResources(activity.activity_id), [] as LearningResourceItem[])
      : [];
    if (!resources.length) {
      const generated = await this.aiService.generateLearningResources(
        activity.stage.goal.goal_id,
        `${activity.title} (${activity.stage.goal.title})`,
      );
      resources = generated;
      if (store) {
        const stored = await store.safely(
          'Guardar recursos de la actividad',
          async () => {
            await store.saveActivityResources(activity.activity_id, generated);
            return store.loadActivityResources(activity.activity_id);
          },
          [] as LearningResourceItem[],
        );
        if (stored.length) resources = stored;
      }
    }

    return {
      activity_id: activity.activity_id,
      activity_title: activity.title,
      goal_id: activity.stage.goal.goal_id,
      goal_title: activity.stage.goal.title,
      resources,
    };
  }

  private timeToSeconds(time: string): number {
    const [hours, minutes, seconds = '0'] = time.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }
}
