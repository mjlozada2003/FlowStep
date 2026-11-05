import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ActivitySchedule } from './entities/activity-schedule.entity';
import { WorkSession } from './entities/work-session.entity';
import { MissReason } from './entities/miss-reason.entity';
import { ScheduleMiss } from './entities/schedule-miss.entity';
import { ActivityOrigin, ActivityStatus, ActivityType } from './enums/activity.enum';
import { ScheduleReason } from './enums/schedule-reason.enum';
import { BadRequestException } from '@nestjs/common';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockActivityRepository: any = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
  };

  const mockStatusHistoryRepository = {
    create: jest.fn((record) => record),
    save: jest.fn(),
  };

  const mockEntityManager = {
    getRepository: jest.fn((entity) =>
      entity === Activity ? mockActivityRepository : mockStatusHistoryRepository,
    ),
  };

  mockActivityRepository.manager = {
    transaction: jest.fn((callback) => callback(mockEntityManager)),
  };

  const mockStageRepository = {
    findOne: jest.fn(),
  };

  const mockWorkSessionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockMissReasonRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockScheduleMissRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockScheduleRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockActivityRepository,
        },
        {
          provide: getRepositoryToken(Stage),
          useValue: mockStageRepository,
        },
        {
          provide: getRepositoryToken(ActivitySchedule),
          useValue: mockScheduleRepository,
        },
        {
          provide: getRepositoryToken(WorkSession),
          useValue: mockWorkSessionRepository,
        },
        {
          provide: getRepositoryToken(MissReason),
          useValue: mockMissReasonRepository,
        },
        {
          provide: getRepositoryToken(ScheduleMiss),
          useValue: mockScheduleMissRepository,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reschedule', () => {
    it('should reschedule an activity creating a new version (HU-14)', async () => {
      mockActivityRepository.findOne.mockResolvedValue({ activity_id: 1 });
      mockScheduleRepository.findOne.mockResolvedValue({
        schedule_id: 1,
        activity_id: 1,
        version_number: 1,
        scheduled_date: '2026-11-01',
      });

      const dto = {
        scheduled_date: '2026-11-05',
        start_time: '14:00',
        end_time: '15:30',
      };

      const newSchedule = {
        schedule_id: 2,
        activity_id: 1,
        version_number: 2,
        reason: ScheduleReason.USER_RESCHEDULE,
        ...dto,
      };

      mockScheduleRepository.create.mockReturnValue(newSchedule);
      mockScheduleRepository.save.mockResolvedValue(newSchedule);

      const result = await service.reschedule(7, 1, dto);
      expect(result.version_number).toBe(2);
      expect(result.reason).toBe(ScheduleReason.USER_RESCHEDULE);
      expect(mockScheduleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_id: 1,
          version_number: 2,
          reason: ScheduleReason.USER_RESCHEDULE,
          scheduled_date: '2026-11-05',
        }),
      );
    });

    it('should throw BadRequestException if end_time <= start_time', async () => {
      mockActivityRepository.findOne.mockResolvedValue({ activity_id: 1 });

      await expect(
        service.reschedule(7, 1, {
          scheduled_date: '2026-11-05',
          start_time: '16:00',
          end_time: '14:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createForStage', () => {
    it('should create a manual activity for a stage (HU-13)', async () => {
      const stage = {
        stage_id: 1,
        activities: [{ sort_order: 1 }, { sort_order: 2 }],
      };
      mockStageRepository.findOne.mockResolvedValue(stage);

      const dto = {
        title: 'Crear componente UI',
        type: ActivityType.PRACTICE,
        estimated_minutes: 60,
      };

      const createdActivity = {
        activity_id: 10,
        stage_id: 1,
        ...dto,
        sort_order: 3,
        origin: ActivityOrigin.MANUAL,
        status: ActivityStatus.PENDING,
      };

      mockActivityRepository.create.mockReturnValue(createdActivity);
      mockActivityRepository.save.mockResolvedValue(createdActivity);

      const result = await service.createForStage(7, 1, dto);
      expect(result.sort_order).toBe(3);
      expect(result.origin).toBe(ActivityOrigin.MANUAL);
    });
  });

  describe('update', () => {
    it('should update activity fields (HU-11)', async () => {
      const existing = {
        activity_id: 1,
        title: 'Viejo Título',
        estimated_minutes: 30,
      };
      mockActivityRepository.findOne.mockResolvedValue(existing);
      mockActivityRepository.save.mockImplementation((act) => Promise.resolve(act));

      const updated = await service.update(7, 1, { title: 'Nuevo Título' });
      expect(updated.title).toBe('Nuevo Título');
    });
  });

  describe('markAsPending', () => {
    it('should mark activity as pending and clear completed_at (HU-16)', async () => {
      const completedAt = new Date();
      const existing = {
        activity_id: 1,
        status: ActivityStatus.COMPLETED,
        completed_at: completedAt,
      };
      mockActivityRepository.findOne.mockResolvedValue(existing);
      mockActivityRepository.save.mockImplementation((act) => Promise.resolve(act));

      mockStatusHistoryRepository.save.mockResolvedValue({});

      const result = await service.markAsPending(7, 1);
      expect(result.status).toBe(ActivityStatus.PENDING);
      expect(result.completed_at).toBeNull();
      expect(mockStatusHistoryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_id: 1,
          previous_status: ActivityStatus.COMPLETED,
          new_status: ActivityStatus.PENDING,
          previous_completed_at: completedAt,
        }),
      );
    });
  });

  it('scopes activity lookups through the owning goal', async () => {
    mockActivityRepository.findOne.mockResolvedValue({ activity_id: 4 });

    await service.findById(7, 4);

    expect(mockActivityRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          activity_id: 4,
          stage: { goal: { user_id: 7 } },
        },
      }),
    );
  });

  it('records status changes made through the edit endpoint', async () => {
    const completedAt = new Date();
    const existing = {
      activity_id: 1,
      stage_id: 2,
      status: ActivityStatus.COMPLETED,
      completed_at: completedAt,
    };
    mockActivityRepository.findOne.mockResolvedValue(existing);
    mockActivityRepository.save.mockImplementation((activity) => Promise.resolve(activity));
    mockStatusHistoryRepository.save.mockResolvedValue({});

    const result = await service.update(7, 1, { status: ActivityStatus.PENDING });

    expect(result.completed_at).toBeNull();
    expect(mockStatusHistoryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        previous_status: ActivityStatus.COMPLETED,
        new_status: ActivityStatus.PENDING,
        previous_completed_at: completedAt,
      }),
    );
  });

  it('rejects adding a manual activity to another user’s stage', async () => {
    mockStageRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createForStage(7, 11, {
        title: 'Activity',
        type: ActivityType.PRACTICE,
        estimated_minutes: 30,
      }),
    ).rejects.toThrow();

    expect(mockStageRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stage_id: 11, goal: { user_id: 7 } },
      }),
    );
    expect(mockActivityRepository.save).not.toHaveBeenCalled();
  });

  describe('logWorkSession (HU-17, HU-18)', () => {
    it('should log a work session successfully', async () => {
      const activity = { activity_id: 1, title: 'Test Activity', estimated_minutes: 60 };
      mockActivityRepository.findOne.mockResolvedValue(activity);

      const dto = {
        minutes_spent: 45,
        session_date: '2026-11-04',
        difficulty_level: 3,
        difficulty_notes: 'Práctica moderada',
      };

      const expectedSession = {
        session_id: 1,
        activity_id: 1,
        ...dto,
      };

      mockWorkSessionRepository.create.mockReturnValue(expectedSession);
      mockWorkSessionRepository.save.mockResolvedValue(expectedSession);

      const result = await service.logWorkSession(7, 1, dto);
      expect(result).toEqual(expectedSession);
      expect(mockWorkSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          activity_id: 1,
          minutes_spent: 45,
          session_date: '2026-11-04',
          difficulty_level: 3,
          difficulty_notes: 'Práctica moderada',
        }),
      );
      expect(mockWorkSessionRepository.save).toHaveBeenCalledWith(expectedSession);
    });
  });

  describe('getWorkSessions (HU-17)', () => {
    it('should return session history and total logged minutes', async () => {
      const activity = { activity_id: 1, title: 'Test Activity', estimated_minutes: 60 };
      mockActivityRepository.findOne.mockResolvedValue(activity);

      const sessions = [
        { session_id: 1, minutes_spent: 30, session_date: '2026-11-04' },
        { session_id: 2, minutes_spent: 20, session_date: '2026-11-03' },
      ];
      mockWorkSessionRepository.find.mockResolvedValue(sessions);

      const result = await service.getWorkSessions(7, 1);
      expect(result.activity_id).toBe(1);
      expect(result.total_logged_minutes).toBe(50);
      expect(result.estimated_minutes).toBe(60);
      expect(result.sessions).toEqual(sessions);
    });
  });

  describe('recordMiss (HU-19)', () => {
    it('should record an activity miss successfully', async () => {
      const activity = { activity_id: 1, title: 'Test Activity' };
      const reason = { reason_id: 1, name: 'Falta de tiempo' };
      const schedule = { schedule_id: 10, activity_id: 1, version_number: 1 };

      mockActivityRepository.findOne.mockResolvedValue(activity);
      mockMissReasonRepository.findOne.mockResolvedValue(reason);
      mockScheduleRepository.findOne.mockResolvedValue(schedule);
      mockScheduleMissRepository.findOne.mockResolvedValue(null);

      const expectedMiss = {
        miss_id: 1,
        schedule_id: 10,
        reason_id: 1,
        details: 'Demasiado trabajo',
        reason,
      };

      mockScheduleMissRepository.create.mockReturnValue(expectedMiss);
      mockScheduleMissRepository.save.mockResolvedValue(expectedMiss);

      const result = await service.recordMiss(7, 1, {
        reason_id: 1,
        details: 'Demasiado trabajo',
      });

      expect(result).toEqual(expectedMiss);
      expect(mockScheduleMissRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          schedule_id: 10,
          reason_id: 1,
          details: 'Demasiado trabajo',
        }),
      );
      expect(mockScheduleMissRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if miss already exists for schedule', async () => {
      const activity = { activity_id: 1 };
      const reason = { reason_id: 1, name: 'Falta de tiempo' };
      const schedule = { schedule_id: 10, activity_id: 1 };

      mockActivityRepository.findOne.mockResolvedValue(activity);
      mockMissReasonRepository.findOne.mockResolvedValue(reason);
      mockScheduleRepository.findOne.mockResolvedValue(schedule);
      mockScheduleMissRepository.findOne.mockResolvedValue({ miss_id: 99 });

      await expect(
        service.recordMiss(7, 1, { reason_id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMissReasons (HU-19)', () => {
    it('should return catalog of miss reasons', async () => {
      const reasons = [{ reason_id: 1, name: 'Falta de tiempo' }];
      mockMissReasonRepository.find.mockResolvedValue(reasons);

      const result = await service.getMissReasons();
      expect(result).toEqual(reasons);
    });
  });

  describe('getActivityTimeline (HU-20)', () => {
    it('should query timeline view with filters', async () => {
      const mockEvents = [
        {
          activity_id: 1,
          event_type: 'work_session',
          event_date: '2026-11-04',
          details: { minutes_spent: 30 },
        },
      ];

      mockActivityRepository.query.mockResolvedValue(mockEvents);

      const result = await service.getActivityTimeline(7, {
        goal_id: 1,
        event_type: 'work_session',
      });

      expect(result).toEqual(mockEvents);
      expect(mockActivityRepository.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM v_activity_timeline WHERE user_id = $1'),
        expect.arrayContaining([7, 1, 'work_session', 50, 0]),
      );
    });

    it('should throw BadRequestException when from is an impossible date (HU-20)', async () => {
      await expect(
        service.getActivityTimeline(7, { from: '2026-99-99' }),
      ).rejects.toThrow();
    });

    it('should throw BadRequestException when from date is after to date (HU-20)', async () => {
      await expect(
        service.getActivityTimeline(7, { from: '2026-11-30', to: '2026-11-01' }),
      ).rejects.toThrow();
    });
  });

  describe('getActivityHistoryById (HU-20)', () => {
    it('should retrieve history for a specific owned activity', async () => {
      const activity = { activity_id: 1, title: 'Activity 1' };
      mockActivityRepository.findOne.mockResolvedValue(activity);
      mockActivityRepository.query.mockResolvedValue([]);

      const result = await service.getActivityHistoryById(7, 1);
      expect(result).toEqual([]);
      expect(mockActivityRepository.findOne).toHaveBeenCalled();
  });
});
});
