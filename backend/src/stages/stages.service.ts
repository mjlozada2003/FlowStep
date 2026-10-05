import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Stage } from './entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';

@Injectable()
export class StagesService {
  constructor(
    @InjectRepository(Stage)
    private stagesRepository: Repository<Stage>,
  ) {}

  async getActivitiesByStage(stageId: number): Promise<Activity[]> {
    const stage = await this.stagesRepository.findOne({
      where: { stage_id: stageId },
      relations: {
        activities: true,
      },
      order: {
        activities: {
          sort_order: 'ASC',
        },
      },
    });

    if (!stage) {
      throw new NotFoundException(`La etapa con ID ${stageId} no existe`);
    }

    return stage.activities;
  }
}
