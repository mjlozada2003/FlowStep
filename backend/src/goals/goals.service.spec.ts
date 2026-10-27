import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { Goal } from './entities/goal.entity';
import { Stage } from '../stages/entities/stage.entity';
import { Activity } from '../activities/entities/activity.entity';
import { ActivitySchedule } from '../activities/entities/activity-schedule.entity';
import { AvailabilityService } from '../availability/availability.service';
import { AiService } from '../ai/ai.service';
import { PriorityLevel } from './enums/goal.enum';
import { DayOfWeek } from '../availability/enums/day-of-week.enum';
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

  const mockScheduleRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAvailabilityService = {
    findAllByUser: jest.fn(),
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
          provide: getRepositoryToken(ActivitySchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: AvailabilityService,
          useValue: mockAvailabilityService,
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

  describe('create with availability adaptation (HU-36, HU-07)', () => {
    it('should query user availability and adapt plan and schedules', async () => {
      const userAvailabilities = [
        {
          availability_id: 1,
          user_id: 1,
          day_of_week: DayOfWeek.MONDAY,
          start_time: '18:00',
          end_time: '20:00',
        },
      ];
      mockAvailabilityService.findAllByUser.mockResolvedValue(userAvailabilities);

      const savedGoal = {
        goal_id: 1,
        user_id: 1,
        title: 'Meta con IA',
        user_description: 'Descripción',
        start_date: new Date('2026-11-01'),
      };
      mockGoalRepository.create.mockReturnValue(savedGoal);
      mockGoalRepository.save.mockResolvedValue(savedGoal);

      mockAiService.generateInitialPlan.mockResolvedValue({
        stages: [
          {
            name: 'Etapa 1',
            sort_order: 1,
            activities: [
              {
                title: 'Actividad adaptada',
                type: 'learning',
                estimated_minutes: 60,
                sort_order: 1,
              },
            ],
          },
        ],
      });

      mockStageRepository.create.mockReturnValue({ stage_id: 1 });
      mockStageRepository.save.mockResolvedValue({ stage_id: 1 });

      mockActivityRepository.create.mockReturnValue({ activity_id: 1 });
      mockActivityRepository.save.mockResolvedValue({ activity_id: 1 });

      mockScheduleRepository.create.mockReturnValue({ schedule_id: 1 });
      mockScheduleRepository.save.mockResolvedValue({ schedule_id: 1 });

      mockGoalRepository.findOne.mockResolvedValue(savedGoal);

      const result = await service.create(1, {
        title: 'Meta con IA',
        user_description: 'Descripción',
      });

      expect(mockAvailabilityService.findAllByUser).toHaveBeenCalledWith(1);
      expect(mockAiService.generateInitialPlan).toHaveBeenCalledWith(
        'Meta con IA',
        'Descripción',
        userAvailabilities,
      );
      expect(result).toBeDefined();
    });
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
