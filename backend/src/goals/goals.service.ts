import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Goal } from './entities/goal.entity';
import { CreateGoalDto } from './dto/create-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal)
    private goalsRepository: Repository<Goal>,
  ) {}

  async create(userId: number, createGoalDto: CreateGoalDto): Promise<Goal> {
    const newGoal = this.goalsRepository.create({
      user_id: userId,
      ...createGoalDto,
    });
    return this.goalsRepository.save(newGoal);
  }

  async findAllByUser(userId: number): Promise<Goal[]> {
    return this.goalsRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
  }
}
