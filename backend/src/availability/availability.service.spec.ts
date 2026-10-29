import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AvailabilityService } from './availability.service';
import { Availability } from './entities/availability.entity';
import { DayOfWeek } from './enums/day-of-week.enum';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('AvailabilityService', () => {
  let service: AvailabilityService;

  const mockAvailabilityRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Availability),
          useValue: mockAvailabilityRepository,
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
      mockAvailabilityRepository.findOne.mockResolvedValue(null);
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

    it('should throw ConflictException if slot already exists at same day and start_time', async () => {
      const dto = {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '18:00',
        end_time: '20:00',
      };
      mockAvailabilityRepository.findOne.mockResolvedValue({
        availability_id: 1,
        user_id: 1,
        ...dto,
      });

      await expect(service.create(1, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if availability slot does not exist', async () => {
      mockAvailabilityRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(1, 999)).rejects.toThrow(NotFoundException);
    });
  });
});
