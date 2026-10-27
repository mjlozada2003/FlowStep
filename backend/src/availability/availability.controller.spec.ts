import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { DayOfWeek } from './enums/day-of-week.enum';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;

  const mockAvailabilityService = {
    create: jest.fn(),
    bulkSet: jest.fn(),
    findAllByUser: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AvailabilityController],
      providers: [
        {
          provide: AvailabilityService,
          useValue: mockAvailabilityService,
        },
      ],
    }).compile();

    controller = module.get<AvailabilityController>(AvailabilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an availability slot (HU-35, HU-07)', async () => {
      const req = { user: { userId: 1 } };
      const dto = {
        day_of_week: DayOfWeek.MONDAY,
        start_time: '18:00',
        end_time: '20:00',
      };
      const expectedResult = { availability_id: 1, user_id: 1, ...dto };

      mockAvailabilityService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(req, dto);
      expect(result).toEqual(expectedResult);
      expect(mockAvailabilityService.create).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('findAll', () => {
    it('should return availability slots for the user', async () => {
      const req = { user: { userId: 1 } };
      const expectedList = [
        {
          availability_id: 1,
          user_id: 1,
          day_of_week: DayOfWeek.MONDAY,
          start_time: '18:00',
          end_time: '20:00',
        },
      ];

      mockAvailabilityService.findAllByUser.mockResolvedValue(expectedList);

      const result = await controller.findAll(req);
      expect(result).toEqual(expectedList);
      expect(mockAvailabilityService.findAllByUser).toHaveBeenCalledWith(1);
    });
  });
});
