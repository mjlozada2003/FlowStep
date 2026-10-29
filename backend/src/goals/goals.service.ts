import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivitySchedule } from '../activities/entities/activity-schedule.entity';
import { AvailabilityService } from '../availability/availability.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AiService, UserAvailabilitySlot } from '../ai/ai.service';
import { ActivityOrigin, ActivityStatus, ActivityType } from '../activities/enums/activity.enum';
import { PriorityLevel } from './enums/goal.enum';
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

    // 3. Generar el plan con IA adaptado a la disponibilidad (HU-02, HU-09, HU-36)
    try {
      const plan = await this.aiService.generateInitialPlan(
        savedGoal.title,
        savedGoal.user_description,
        userAvailabilities,
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
}
