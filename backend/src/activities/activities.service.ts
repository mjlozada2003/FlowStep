import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ActivitySchedule } from './entities/activity-schedule.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { RescheduleActivityDto } from './dto/reschedule-activity.dto';
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
  ) {}

  async createForStage(stageId: number, dto: CreateActivityDto): Promise<Activity> {
    const stage = await this.stagesRepository.findOne({
      where: { stage_id: stageId },
      relations: { activities: true },
    });

    if (!stage) {
      throw new NotFoundException(`La etapa con ID ${stageId} no existe`);
    }

    const maxOrder = stage.activities?.length
      ? Math.max(...stage.activities.map((a) => a.sort_order || 0))
      : 0;

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

  async findById(activityId: number): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
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

  async update(activityId: number, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    if (dto.status) {
      if (dto.status === ActivityStatus.COMPLETED && !activity.completed_at) {
        activity.completed_at = new Date();
      } else if (dto.status === ActivityStatus.PENDING) {
        activity.completed_at = null as unknown as Date;
      }
    }

    Object.assign(activity, dto);
    return this.activitiesRepository.save(activity);
  }

  async completeActivity(activityId: number): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    activity.status = ActivityStatus.COMPLETED;
    activity.completed_at = new Date();

    return this.activitiesRepository.save(activity);
  }

  async markAsPending(activityId: number): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    activity.status = ActivityStatus.PENDING;
    activity.completed_at = null as unknown as Date;

    return this.activitiesRepository.save(activity);
  }

  async remove(activityId: number): Promise<{ message: string }> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    await this.activitiesRepository.remove(activity);
    return { message: `Actividad con ID ${activityId} eliminada correctamente` };
  }

  async reschedule(activityId: number, dto: RescheduleActivityDto): Promise<ActivitySchedule> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    if (dto.start_time && dto.end_time && dto.start_time >= dto.end_time) {
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

  async getScheduleHistory(activityId: number): Promise<ActivitySchedule[]> {
    const activity = await this.activitiesRepository.findOne({
      where: { activity_id: activityId },
    });

    if (!activity) {
      throw new NotFoundException(`La actividad con ID ${activityId} no existe`);
    }

    return this.schedulesRepository.find({
      where: { activity_id: activityId },
      order: { version_number: 'ASC' },
    });
  }
}
