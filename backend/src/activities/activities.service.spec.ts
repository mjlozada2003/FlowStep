import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { Stage } from '../stages/entities/stage.entity';
import { ActivityOrigin, ActivityStatus, ActivityType } from './enums/activity.enum';
import { NotFoundException } from '@nestjs/common';

describe('ActivitiesService', () => {
  let service: ActivitiesService;

  const mockActivityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockStageRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const result = await service.createForStage(1, dto);
      expect(result.sort_order).toBe(3);
      expect(result.origin).toBe(ActivityOrigin.MANUAL);
      expect(mockActivityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          stage_id: 1,
          origin: ActivityOrigin.MANUAL,
          status: ActivityStatus.PENDING,
          sort_order: 3,
        }),
      );
    });

    it('should throw NotFoundException if stage does not exist', async () => {
      mockStageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createForStage(999, {
          title: 'Test',
          type: ActivityType.PRACTICE,
          estimated_minutes: 30,
        }),
      ).rejects.toThrow(NotFoundException);
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

      const updated = await service.update(1, { title: 'Nuevo Título' });
      expect(updated.title).toBe('Nuevo Título');
    });
  });

  describe('markAsPending', () => {
    it('should mark activity as pending and clear completed_at (HU-16)', async () => {
      const existing = {
        activity_id: 1,
        status: ActivityStatus.COMPLETED,
        completed_at: new Date(),
      };
      mockActivityRepository.findOne.mockResolvedValue(existing);
      mockActivityRepository.save.mockImplementation((act) => Promise.resolve(act));

      const result = await service.markAsPending(1);
      expect(result.status).toBe(ActivityStatus.PENDING);
      expect(result.completed_at).toBeNull();
    });
  });
});
