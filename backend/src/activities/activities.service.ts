import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from './entities/activity.entity';
import { ActivityStatus } from './enums/activity.enum';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
  ) {}

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
}
