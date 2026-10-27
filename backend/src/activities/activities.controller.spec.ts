import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityStatus } from './enums/activity.enum';
import { ScheduleReason } from './enums/schedule-reason.enum';

describe('ActivitiesController', () => {
  let controller: ActivitiesController;

  const mockActivitiesService = {
    findById: jest.fn(),
    update: jest.fn(),
    completeActivity: jest.fn(),
    markAsPending: jest.fn(),
    remove: jest.fn(),
    reschedule: jest.fn(),
    getScheduleHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: mockActivitiesService,
        },
      ],
    }).compile();

    controller = module.get<ActivitiesController>(ActivitiesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reschedule', () => {
    it('should reschedule an activity (HU-14)', async () => {
      const dto = {
        scheduled_date: '2026-11-05',
        start_time: '10:00',
        end_time: '11:00',
      };
      const expectedResult = {
        schedule_id: 2,
        activity_id: 1,
        version_number: 2,
        reason: ScheduleReason.USER_RESCHEDULE,
        ...dto,
      };

      mockActivitiesService.reschedule.mockResolvedValue(expectedResult);

      const result = await controller.reschedule(1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.reschedule).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('update', () => {
    it('should update an activity (HU-11)', async () => {
      const dto = { title: 'Nuevo Título', estimated_minutes: 45 };
      const expectedResult = { activity_id: 1, ...dto };

      mockActivitiesService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.update).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('markAsPending', () => {
    it('should mark an activity as pending (HU-16)', async () => {
      const expectedResult = {
        activity_id: 1,
        status: ActivityStatus.PENDING,
        completed_at: null,
      };

      mockActivitiesService.markAsPending.mockResolvedValue(expectedResult);

      const result = await controller.markAsPending(1);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.markAsPending).toHaveBeenCalledWith(1);
    });
  });
});
