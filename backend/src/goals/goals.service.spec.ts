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
    query: jest.fn(),
  };

  const mockStageRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockQueryBuilder: any = {
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(2),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  const mockActivityRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  const mockScheduleRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockAvailabilityService = {
    findAllByUser: jest.fn(),
    getPreferences: jest.fn(),
  };

  const mockAiService = {
    generateInitialPlan: jest.fn(),
    generateRecommendationDiagnostic: jest.fn(),
    generateReplanAlternatives: jest.fn(),
    generateGoalKnowledge: jest.fn(),
    generateLearningResources: jest.fn(),
    generateEvaluationQuiz: jest.fn(),
    evaluateQuizAnswers: jest.fn(),
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
      mockAvailabilityService.getPreferences.mockResolvedValue({
        user_id: 1,
        session_duration_minutes: 30,
      });

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
        30,
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

  describe('getAllGoalsProgress (HU-22)', () => {
    it('should query progress for all goals owned by user', async () => {
      const mockList = [{ goal_id: 1, progress_percentage: 50 }];
      mockGoalRepository.query.mockResolvedValue(mockList);

      const result = await service.getAllGoalsProgress(1);
      expect(result).toEqual(mockList);
      expect(mockGoalRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM v_goal_progress WHERE user_id = $1'),
        [1],
      );
    });
  });

  describe('getGoalPace (HU-24)', () => {
    it('should return pace with delay alert when behind', async () => {
      mockGoalRepository.findOne.mockResolvedValue({ goal_id: 1, user_id: 1, title: 'Meta' });
      mockGoalRepository.query.mockResolvedValue([{
        goal_id: 1,
        pace_status: 'behind',
        completed_estimated_minutes: 60,
        expected_completed_minutes: 120,
        progress_percentage: 25,
        expected_progress_percentage: 50,
      }]);

      const result = await service.getGoalPace(1, 1);
      expect(result.is_delayed).toBe(true);
      expect(result.delay_minutes).toBe(60);
      expect(result.delay_percentage).toBe(25);
      expect(result.alert_message).toContain('posible retraso');
    });

    it('should return on_track alert when pacing is good', async () => {
      mockGoalRepository.findOne.mockResolvedValue({ goal_id: 1, user_id: 1, title: 'Meta' });
      mockGoalRepository.query.mockResolvedValue([{
        goal_id: 1,
        pace_status: 'on_track',
        completed_estimated_minutes: 120,
        expected_completed_minutes: 120,
        progress_percentage: 50,
        expected_progress_percentage: 50,
      }]);

      const result = await service.getGoalPace(1, 1);
      expect(result.is_delayed).toBe(false);
      expect(result.alert_message).toContain('¡Excelente!');
    });
  });

  describe('getGoalChartData (HU-21)', () => {
    it('should aggregate weekly, stage, and status distributions', async () => {
      mockGoalRepository.findOne.mockResolvedValue({ goal_id: 1, user_id: 1, title: 'Meta' });
      mockGoalRepository.query
        .mockResolvedValueOnce([{ week_start: '2026-11-02', minutes_spent: 120 }])
        .mockResolvedValueOnce([{ stage_id: 10, stage_name: 'Fase 1', progress_percentage: 100 }])
        .mockResolvedValueOnce([{ status: 'completed', count: 5, total_minutes: 120 }]);

      const result = await service.getGoalChartData(1, 1);
      expect(result).toHaveProperty('weekly_progress');
      expect(result).toHaveProperty('stage_progress');
      expect(result).toHaveProperty('status_distribution');
      expect(result.status_distribution.completed).toBe(5);
    });
  });

  describe('Sprint 5: getGoalRecommendations (HU-04, HU-26, HU-30)', () => {
    it('should generate diagnostic and recommendations based on delay and progress', async () => {
      mockGoalRepository.findOne.mockResolvedValue({
        goal_id: 1,
        user_id: 1,
        title: 'Meta con retraso',
        stages: [{ activities: [{ title: 'Actividad 1' }] }],
      });
      mockGoalRepository.query
        .mockResolvedValueOnce([{ goal_id: 1, max_days_late: 3, most_overdue_activity_title: 'Actividad 1' }])
        .mockResolvedValueOnce([{ progress_percentage: 20, completed_activities: 1, total_activities: 5 }])
        .mockResolvedValueOnce([]);

      mockAiService.generateRecommendationDiagnostic.mockResolvedValue({
        goal_id: 1,
        goal_title: 'Meta con retraso',
        root_cause: 'Retraso acumulado',
        recommended_actions: ['Replanificar actividades'],
        urgency: 'high',
      });

      const result = await service.getGoalRecommendations(1, 1);
      expect(result).toHaveProperty('urgency', 'high');
      expect(mockAiService.generateRecommendationDiagnostic).toHaveBeenCalled();
    });
  });

  describe('Sprint 5: getReplanAlternatives & apply (HU-27, HU-28, HU-29, HU-30, HU-31, HU-51, HU-52)', () => {
    it('should return replanning alternatives and allow applying an alternative', async () => {
      mockGoalRepository.findOne.mockResolvedValue({
        goal_id: 1,
        user_id: 1,
        title: 'Meta a replanificar',
        stages: [{ stage_id: 1, activities: [{ activity_id: 1, status: 'pending' }] }],
      });
      mockGoalRepository.query.mockResolvedValue([]);
      mockAiService.generateReplanAlternatives.mockResolvedValue({
        alternatives: [
          { proposal_type: 'balanced', title: 'Equilibrada', summary: 'Ajuste balanceado' },
        ],
      });

      const alternatives = await service.getReplanAlternatives(1, 1);
      expect(alternatives).toHaveProperty('alternatives');

      // Test reject
      const rejectResult = await service.rejectReplanAlternative(1, 1);
      expect(rejectResult.status).toBe('rejected');
    });
  });

  describe('Sprint 5: Knowledge, Resources & Evaluation (HU-05, HU-37, HU-38, HU-40, HU-41, HU-42)', () => {
    it('should retrieve knowledge topics and learning resources', async () => {
      mockGoalRepository.findOne.mockResolvedValue({
        goal_id: 1,
        user_id: 1,
        title: 'Meta de estudio',
        stages: [{ activities: [{ title: 'Lectura' }] }],
      });
      mockAiService.generateGoalKnowledge.mockResolvedValue({
        goal_id: 1,
        knowledge_topics: ['Tema 1', 'Tema 2'],
      });
      mockAiService.generateLearningResources.mockResolvedValue([
        { id: '1', title: 'Recurso A', type: 'LECTURA', duration: '5 min' },
      ]);

      const knowledge = await service.getGoalKnowledge(1, 1);
      expect(knowledge.knowledge_topics).toContain('Tema 1');

      const resources = await service.getGoalResources(1, 1);
      expect(resources).toHaveLength(1);
    });

    it('should evaluate quiz answers and identify weak topics (HU-40, HU-41)', async () => {
      mockGoalRepository.findOne.mockResolvedValue({
        goal_id: 1,
        user_id: 1,
        title: 'Meta de estudio',
      });
      mockAiService.evaluateQuizAnswers.mockResolvedValue({
        goal_id: 1,
        score: 3,
        total_questions: 4,
        percentage: 75,
        weak_topics: ['Tema B'],
        reinforcement_recommendations: ['Reforzar Tema B'],
      });

      const result = await service.submitGoalEvaluation(1, 1, {
        answers: [{ question_id: 1, selected_option_id: 'a' }],
      });
      expect(result.score).toBe(3);
      expect(result.weak_topics).toContain('Tema B');
    });
  });
});
