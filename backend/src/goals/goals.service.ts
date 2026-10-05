import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';
import { CreateGoalDto } from './dto/create-goal.dto';
import { AiService } from '../ai/ai.service';
import { ActivityOrigin, ActivityStatus } from '../activities/enums/activity.enum';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
    @InjectRepository(Stage)
    private stagesRepository: Repository<Stage>,
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    private aiService: AiService
  ) {}

  async create(userId: number, createGoalDto: CreateGoalDto): Promise<Goal | null> {
    // 1. Guardar la meta base (HU-01)
    const newGoal = this.goalsRepository.create({
      user_id: userId,
      ...createGoalDto,
    });
    const savedGoal = await this.goalsRepository.save(newGoal);

    // 2. Generar el plan con IA (HU-02 y HU-09)
    try {
      const plan = await this.aiService.generateInitialPlan(savedGoal.title, savedGoal.user_description);
      
      // 3. Guardar las etapas y actividades
      if (plan && plan.stages) {
        for (const stageData of plan.stages) {
          const newStage = this.stagesRepository.create({
            goal_id: savedGoal.goal_id,
            name: stageData.name,
            description: stageData.description,
            sort_order: stageData.sort_order,
          });
          const savedStage = await this.stagesRepository.save(newStage);

          if (stageData.activities) {
            const activitiesToSave = stageData.activities.map((act: any) => {
              return this.activitiesRepository.create({
                stage_id: savedStage.stage_id,
                title: act.title,
                type: act.type,
                estimated_minutes: act.estimated_minutes,
                sort_order: act.sort_order,
                origin: ActivityOrigin.INITIAL_PLAN,
                status: ActivityStatus.PENDING
              });
            });
            await this.activitiesRepository.save(activitiesToSave);
          }
        }
      }
    } catch (error) {
      console.error('No se pudo generar el plan automático. Se requiere generación manual o reintento.', error);
      // Opcional: Podrías marcar el goal con un estado especial o lanzar error
    }

    // 4. Retornar el goal completo con sus etapas
    return this.goalsRepository.findOne({
      where: { goal_id: savedGoal.goal_id },
      relations: {
        stages: {
          activities: true
        }
      }
    });
  }

  async findAllByUser(userId: number): Promise<Goal[]> {
    return this.goalsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
