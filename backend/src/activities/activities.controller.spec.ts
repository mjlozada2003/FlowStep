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
    logWorkSession: jest.fn(),
    getWorkSessions: jest.fn(),
    getMissReasons: jest.fn(),
    recordMiss: jest.fn(),
    getActivityMisses: jest.fn(),
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

      const req = { user: { userId: 7 } };
      const result = await controller.reschedule(req, 1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.reschedule).toHaveBeenCalledWith(7, 1, dto);
    });
  });

  describe('update', () => {
    it('should update an activity (HU-11)', async () => {
      const dto = { title: 'Nuevo Título', estimated_minutes: 45 };
      const expectedResult = { activity_id: 1, ...dto };

      mockActivitiesService.update.mockResolvedValue(expectedResult);

      const req = { user: { userId: 7 } };
      const result = await controller.update(req, 1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.update).toHaveBeenCalledWith(7, 1, dto);
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

      const req = { user: { userId: 7 } };
      const result = await controller.markAsPending(req, 1);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.markAsPending).toHaveBeenCalledWith(7, 1);
    });
  });

  describe('logWorkSession (HU-17, HU-18)', () => {
    it('should log a work session', async () => {
      const dto = {
        minutes_spent: 45,
        session_date: '2026-11-04',
        difficulty_level: 3,
        difficulty_notes: 'Buen avance',
      };
      const expectedResult = {
        session_id: 1,
        activity_id: 1,
        ...dto,
      };

      mockActivitiesService.logWorkSession.mockResolvedValue(expectedResult);

      const req = { user: { userId: 7 } };
      const result = await controller.logWorkSession(req, 1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.logWorkSession).toHaveBeenCalledWith(7, 1, dto);
    });
  });

  describe('getWorkSessions (HU-17)', () => {
    it('should retrieve work sessions for an activity', async () => {
      const expectedResult = {
        activity_id: 1,
        activity_title: 'Práctica',
        estimated_minutes: 60,
        total_logged_minutes: 45,
        sessions: [],
      };

      mockActivitiesService.getWorkSessions.mockResolvedValue(expectedResult);

      const req = { user: { userId: 7 } };
      const result = await controller.getWorkSessions(req, 1);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.getWorkSessions).toHaveBeenCalledWith(7, 1);
    });
  });

  describe('recordMiss (HU-19)', () => {
    it('should record an activity miss', async () => {
      const dto = { reason_id: 1, details: 'Imprevisto' };
      const expectedResult = { miss_id: 1, schedule_id: 5, ...dto };

      mockActivitiesService.recordMiss.mockResolvedValue(expectedResult);

      const req = { user: { userId: 7 } };
      const result = await controller.recordMiss(req, 1, dto);
      expect(result).toEqual(expectedResult);
      expect(mockActivitiesService.recordMiss).toHaveBeenCalledWith(7, 1, dto);
    });
  });

  describe('getMissReasons (HU-19)', () => {
    it('should retrieve miss reasons catalog', async () => {
      const reasons = [{ reason_id: 1, name: 'Falta de tiempo' }];
      mockActivitiesService.getMissReasons.mockResolvedValue(reasons);

      const result = await controller.getMissReasons();
      expect(result).toEqual(reasons);
    });
  });
    });
  });
});
