import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { StagesService } from './stages.service';
import { Stage } from './entities/stage.entity';

describe('StagesService', () => {
  let service: StagesService;
  const stagesRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StagesService,
        { provide: getRepositoryToken(Stage), useValue: stagesRepository },
      ],
    }).compile();

    service = module.get<StagesService>(StagesService);
  });

  it('filters stage activity lookup by goal owner', async () => {
    stagesRepository.findOne.mockResolvedValue({
      stage_id: 3,
      activities: [{ activity_id: 8 }],
    });

    await expect(service.getActivitiesByStage(7, 3)).resolves.toEqual([
      { activity_id: 8 },
    ]);
    expect(stagesRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stage_id: 3, goal: { user_id: 7 } },
      }),
    );
  });

  it('does not expose stages owned by another user', async () => {
    stagesRepository.findOne.mockResolvedValue(null);

    await expect(service.getActivitiesByStage(7, 3)).rejects.toThrow(
      NotFoundException,
    );
  });
});
