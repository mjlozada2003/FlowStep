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
});
