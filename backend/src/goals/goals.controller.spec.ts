import { Test, TestingModule } from '@nestjs/testing';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { PriorityLevel } from './enums/goal.enum';

describe('GoalsController', () => {
  let controller: GoalsController;

  const mockGoalsService = {
    create: jest.fn(),
    findAllByUser: jest.fn(),
    findOneByUser: jest.fn(),
    findOne: jest.fn(),
    getProgress: jest.fn(),
    updatePriority: jest.fn(),
    update: jest.fn(),
    getAllGoalsProgress: jest.fn(),
    getGoalPace: jest.fn(),
    getAllGoalsPace: jest.fn(),
    getGoalChartData: jest.fn(),
    getGoalWeeklyProgress: jest.fn(),
    getGoalRecommendations: jest.fn(),
    getPersonalizedRecommendations: jest.fn(),
    getReplanAlternatives: jest.fn(),
    applyReplanAlternative: jest.fn(),
    rejectReplanAlternative: jest.fn(),
    getGoalKnowledge: jest.fn(),
    getGoalResources: jest.fn(),
    getGoalEvaluation: jest.fn(),
    submitGoalEvaluation: jest.fn(),
    addReinforcementActivity: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: mockGoalsService,
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updatePriority', () => {
    it('should update the goal priority (HU-06)', async () => {
      const req = { user: { userId: 1 } };
      const dto = { priority: PriorityLevel.HIGH };
      const expectedResult = { goal_id: 1, user_id: 1, priority: PriorityLevel.HIGH };

      mockGoalsService.updatePriority.mockResolvedValue(expectedResult);

      const result = await controller.updatePriority(req, 1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockGoalsService.updatePriority).toHaveBeenCalledWith(1, 1, PriorityLevel.HIGH);
    });
  });

  describe('getProgress', () => {
    it('should return goal progress (HU-03)', async () => {
      const req = { user: { userId: 1 } };
      const expectedProgress = {
        goal_id: 1,
        user_id: 1,
        progress_percentage: '50.00',
      };

      mockGoalsService.getProgress.mockResolvedValue(expectedProgress);

      const result = await controller.getProgress(req, 1);
      expect(result).toEqual(expectedProgress);
      expect(mockGoalsService.getProgress).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getAllProgress (HU-22)', () => {
    it('should return progress of all goals', async () => {
      const req = { user: { userId: 1 } };
      const expected = [{ goal_id: 1, progress_percentage: '50.00' }];

      mockGoalsService.getAllGoalsProgress.mockResolvedValue(expected);

      const result = await controller.getAllProgress(req);
      expect(result).toEqual(expected);
      expect(mockGoalsService.getAllGoalsProgress).toHaveBeenCalledWith(1);
    });
  });

  describe('getGoalPace (HU-24)', () => {
    it('should return goal pace and delay status', async () => {
      const req = { user: { userId: 1 } };
      const expectedPace = {
        goal_id: 1,
        pace_status: 'behind',
        is_delayed: true,
        delay_minutes: 30,
        alert_message: 'Posible retraso',
      };

      mockGoalsService.getGoalPace.mockResolvedValue(expectedPace);

      const result = await controller.getGoalPace(req, 1);
      expect(result).toEqual(expectedPace);
      expect(mockGoalsService.getGoalPace).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('getGoalChartData (HU-21)', () => {
    it('should return aggregated charts data', async () => {
      const req = { user: { userId: 1 } };
      const expectedCharts = {
        goal_id: 1,
        summary: { progress_percentage: '50.00' },
        weekly_progress: [],
        status_distribution: { completed: 2, pending: 2 },
        stage_progress: [],
      };

      mockGoalsService.getGoalChartData.mockResolvedValue(expectedCharts);

      const result = await controller.getGoalChartData(req, 1);
      expect(result).toEqual(expectedCharts);
      expect(mockGoalsService.getGoalChartData).toHaveBeenCalledWith(1, 1);
    });
  });

  describe('Sprint 5 Controller Endpoints', () => {
    const req = { user: { userId: 1 } };

    it('should return recommendations (HU-04, HU-26, HU-30)', async () => {
      const expected = { goal_id: 1, urgency: 'medium' };
      mockGoalsService.getGoalRecommendations.mockResolvedValue(expected);
      const res = await controller.getRecommendations(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getGoalRecommendations).toHaveBeenCalledWith(1, 1);
    });

    it('should return personalized recommendations (HU-43)', async () => {
      const expected = { goal_id: 1, root_cause: 'General' };
      mockGoalsService.getPersonalizedRecommendations.mockResolvedValue(expected);
      const res = await controller.getPersonalizedRecommendations(req);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getPersonalizedRecommendations).toHaveBeenCalledWith(1);
    });

    it('should return replanning alternatives (HU-27, HU-51)', async () => {
      const expected = { goal_id: 1, alternatives: [] };
      mockGoalsService.getReplanAlternatives.mockResolvedValue(expected);
      const res = await controller.getAlternatives(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getReplanAlternatives).toHaveBeenCalledWith(1, 1);
    });

    it('should apply an alternative (HU-31, HU-52, HU-08)', async () => {
      const dto = { proposal_type: 'balanced' as const };
      const expected = { message: 'Plan actualizado exitosamente' };
      mockGoalsService.applyReplanAlternative.mockResolvedValue(expected);
      const res = await controller.applyAlternative(req, 1, dto);
      expect(res).toEqual(expected);
      expect(mockGoalsService.applyReplanAlternative).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should reject alternatives (HU-31)', async () => {
      const expected = { message: 'Plan conservado sin cambios', status: 'rejected' };
      mockGoalsService.rejectReplanAlternative.mockResolvedValue(expected);
      const res = await controller.rejectAlternative(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.rejectReplanAlternative).toHaveBeenCalledWith(1, 1);
    });

    it('should get knowledge topics (HU-37)', async () => {
      const expected = { goal_id: 1, knowledge_topics: ['Tema 1'] };
      mockGoalsService.getGoalKnowledge.mockResolvedValue(expected);
      const res = await controller.getKnowledge(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getGoalKnowledge).toHaveBeenCalledWith(1, 1);
    });

    it('should get learning resources (HU-05, HU-38)', async () => {
      const expected = { goal_id: 1, resources: [] };
      mockGoalsService.getGoalResources.mockResolvedValue(expected);
      const res = await controller.getResources(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getGoalResources).toHaveBeenCalledWith(1, 1);
    });

    it('should get evaluation quiz (HU-40)', async () => {
      const expected = { goal_id: 1, questions: [] };
      mockGoalsService.getGoalEvaluation.mockResolvedValue(expected);
      const res = await controller.getEvaluation(req, 1);
      expect(res).toEqual(expected);
      expect(mockGoalsService.getGoalEvaluation).toHaveBeenCalledWith(1, 1);
    });

    it('should submit evaluation (HU-40, HU-41, HU-42)', async () => {
      const dto = { answers: [{ question_id: 1, selected_option_id: 'a' }] };
      const expected = { score: 1, weak_topics: [] };
      mockGoalsService.submitGoalEvaluation.mockResolvedValue(expected);
      const res = await controller.submitEvaluation(req, 1, dto);
      expect(res).toEqual(expected);
      expect(mockGoalsService.submitGoalEvaluation).toHaveBeenCalledWith(1, 1, dto);
    });

    it('should add reinforcement activity (HU-42, HU-39)', async () => {
      const dto = { topic: 'Álgebra', estimated_minutes: 30 };
      const expected = { message: 'Actividad de refuerzo añadida' };
      mockGoalsService.addReinforcementActivity.mockResolvedValue(expected);
      const res = await controller.addReinforcement(req, 1, dto);
      expect(res).toEqual(expected);
      expect(mockGoalsService.addReinforcementActivity).toHaveBeenCalledWith(1, 1, dto);
    });
  });
});
