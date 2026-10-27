import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityOrigin, ActivityStatus } from './enums/activity.enum';
import { PriorityLevel } from '../goals/enums/goal.enum';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    @InjectRepository(Stage)
    private stagesRepository: Repository<Stage>,
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

    // Si actualiza el estado explícitamente:
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
}
