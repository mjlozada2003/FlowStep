import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ActivitySchedule } from './entities/activity-schedule.entity';
import { ActivityStatusHistory } from './entities/activity-status-history.entity';
import { WorkSession } from './entities/work-session.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
import { CreateWorkSessionDto } from './dto/create-work-session.dto';
import { ActivityOrigin, ActivityStatus } from './enums/activity.enum';
import { PriorityLevel } from '../goals/enums/goal.enum';
import { ScheduleReason } from './enums/schedule-reason.enum';

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

      return activityRepository.save(activity);
    });
  }

  async remove(userId: number, activityId: number): Promise<{ message: string }> {
    const activity = await this.findOwnedActivity(userId, activityId);

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    await this.activitiesRepository.remove(activity);
    return { message: `Actividad con ID ${activityId} eliminada correctamente` };
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

    const sessionDate =
      dto.session_date || new Date().toISOString().split('T')[0];

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

  private timeToSeconds(time: string): number {
    const [hours, minutes, seconds = '0'] = time.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }
}
