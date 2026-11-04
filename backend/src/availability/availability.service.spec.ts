import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { Availability } from './entities/availability.entity';
import { AvailabilityPreference } from './entities/availability-preference.entity';
import { DayOfWeek } from './enums/day-of-week.enum';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockAvailabilityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  const mockPreferenceRepository = {
    findOne: jest.fn(),
  };

  const mockTransactionRepository = {
    delete: jest.fn(),
    save: jest.fn(),
  };
  const mockTransactionPreferenceRepository = {
    save: jest.fn(),
  };
  const mockAvailabilityRepositoryWithManager = mockAvailabilityRepository as typeof mockAvailabilityRepository & {
    manager: {
      transaction: jest.Mock;
    };
  };
  mockAvailabilityRepositoryWithManager.manager = {
    transaction: jest.fn((callback) =>
      callback({
        getRepository: (entity: unknown) =>
          entity === Availability ? mockTransactionRepository : mockTransactionPreferenceRepository,
      }),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Availability),
          useValue: mockAvailabilityRepository,
        },
        {
          provide: getRepositoryToken(AvailabilityPreference),
          useValue: mockPreferenceRepository,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an availability slot successfully (HU-35)', async () => {
      const dto = {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '18:00',
        end_time: '20:00',
      };
      mockAvailabilityRepository.find.mockResolvedValue([]);
      mockAvailabilityRepository.create.mockReturnValue({
        user_id: 1,
        ...dto,
      });
      mockAvailabilityRepository.save.mockResolvedValue({
        availability_id: 1,
        user_id: 1,
        ...dto,
      });

      const result = await service.create(1, dto);
      expect(result.availability_id).toBe(1);
      expect(result.day_of_week).toBe(DayOfWeek.MONDAY);
    });

    it('should throw BadRequestException if end_time <= start_time', async () => {
      const dto = {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '20:00',
        end_time: '18:00',
      };

      await expect(service.create(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if a slot overlaps an existing slot', async () => {
      const dto = {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '18:00',
        end_time: '20:00',
      };
      mockAvailabilityRepository.find.mockResolvedValue([{
        availability_id: 1,
        user_id: 1,
        day_of_week: dto.day_of_week,
        start_time: '17:00',
        end_time: '18:30',
      }]);

      await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  it('rejects duplicate or overlapping slots in a bulk weekly replacement', async () => {
    await expect(
      service.bulkSet(1, [
        {
          day_of_week: DayOfWeek.MONDAY,
          start_time: '18:00',
          end_time: '20:00',
        },
        {
          day_of_week: DayOfWeek.MONDAY,
          start_time: '19:30',
          end_time: '21:00',
        },
      ]),
    ).rejects.toThrow(ConflictException);

    expect(mockAvailabilityRepositoryWithManager.manager.transaction).not.toHaveBeenCalled();
  });

  it('replaces weekly availability transactionally for only the authenticated user', async () => {
    const slots = [
      {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '18:00',
        end_time: '20:00',
      },
    ];
    mockAvailabilityRepository.create.mockImplementation((slot) => slot);
    mockTransactionRepository.save.mockResolvedValue(slots);

    await service.bulkSet(7, slots);

    expect(mockAvailabilityRepositoryWithManager.manager.transaction).toHaveBeenCalled();
    expect(mockTransactionRepository.delete).toHaveBeenCalledWith({ user_id: 7 });
    expect(mockTransactionRepository.save).toHaveBeenCalledWith([
      { ...slots[0], user_id: 7 },
    ]);
  });

  it('saves the selected session duration with the weekly availability', async () => {
    const slots = [{
      day_of_week: DayOfWeek.MONDAY,
      start_time: '18:00',
      end_time: '20:00',
    }];
    mockAvailabilityRepository.create.mockImplementation((slot) => slot);
    mockTransactionRepository.save.mockResolvedValue(slots);

    await service.bulkSet(7, slots, 30);

    expect(mockTransactionPreferenceRepository.save).toHaveBeenCalledWith({
      user_id: 7,
      session_duration_minutes: 30,
    });
  });

  it('retrieves only the authenticated user’s saved availability', async () => {
    mockAvailabilityRepository.find.mockResolvedValue([]);

    await service.findAllByUser(7);

    expect(mockAvailabilityRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: 7 } }),
    );
  });

  it('returns the saved session duration or its initial value', async () => {
    mockPreferenceRepository.findOne.mockResolvedValue({
      user_id: 7,
      session_duration_minutes: 120,
    });

    await expect(service.getPreferences(7)).resolves.toEqual({
      user_id: 7,
      session_duration_minutes: 120,
    });

    mockPreferenceRepository.findOne.mockResolvedValue(null);
    await expect(service.getPreferences(7)).resolves.toEqual({
      user_id: 7,
      session_duration_minutes: 60,
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if availability slot does not exist', async () => {
      mockAvailabilityRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
      expect(mockAvailabilityRepository.findOne).toHaveBeenCalledWith({
        where: { availability_id: 999, user_id: 1 },
      });
    });
  });
});
