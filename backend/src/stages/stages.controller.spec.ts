import { Test, TestingModule } from '@nestjs/testing';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';
import { ActivitiesService } from '../activities/activities.service';
import { ActivityType } from '../activities/enums/activity.enum';

describe('StagesController', () => {
  let controller: StagesController;

  const mockStagesService = {
    getActivitiesByStage: jest.fn(),
  };

  const mockActivitiesService = {
    createForStage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StagesController],
      providers: [
        {
          provide: StagesService,
          useValue: mockStagesService,
        },
        {
          provide: ActivitiesService,
          useValue: mockActivitiesService,
        },
      ],
    }).compile();

    controller = module.get<StagesController>(StagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addActivity', () => {
    it('should delegate to activitiesService.createForStage (HU-13)', async () => {
      const dto = {
        title: 'Práctica de queries',
        type: ActivityType.PRACTICE,
        estimated_minutes: 40,
      };
      const expectedResult = { activity_id: 1, stage_id: 1, ...dto };
      mockActivitiesService.createForStage.mockResolvedValue(expectedResult);

      const result = await controller.addActivity(1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.createForStage).toHaveBeenCalledWith(1, dto);
    });
  });
});
