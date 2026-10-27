import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { Goal } from './entities/goal.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';
import { AiService } from '../ai/ai.service';
import { PriorityLevel } from './enums/goal.enum';
import { NotFoundException } from '@nestjs/common';

describe('GoalsService', () => {
  let service: GoalsService;

  const mockGoalRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockStageRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockActivityRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAiService = {
    generateInitialPlan: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: getRepositoryToken(Goal),
          useValue: mockGoalRepository,
        },
        {
          provide: getRepositoryToken(Stage),
          useValue: mockStageRepository,
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: mockActivityRepository,
        },
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePriority', () => {
    it('should update priority successfully (HU-06)', async () => {
      const existingGoal = { goal_id: 1, user_id: 1, priority: PriorityLevel.LOW };
      mockGoalRepository.findOne.mockResolvedValue(existingGoal);
      mockGoalRepository.save.mockImplementation((goal) => Promise.resolve(goal));

      const updated = await service.updatePriority(1, 1, PriorityLevel.HIGH);
      expect(updated.priority).toBe(PriorityLevel.HIGH);
      expect(mockGoalRepository.findOne).toHaveBeenCalledWith({
        where: { goal_id: 1, user_id: 1 },
      });
      expect(mockGoalRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ priority: PriorityLevel.HIGH }),
      );
    });

    it('should throw NotFoundException if goal does not exist or does not belong to user', async () => {
      mockGoalRepository.findOne.mockResolvedValue(null);

      await expect(service.updatePriority(1, 999, PriorityLevel.HIGH)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
