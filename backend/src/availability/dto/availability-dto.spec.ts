import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BulkAvailabilityDto } from './bulk-availability.dto';
import { CreateAvailabilityDto } from './create-availability.dto';

describe('Availability DTO validation', () => {
  it('rejects invalid time formats', async () => {
    const dto = plainToInstance(CreateAvailabilityDto, {
      day_of_week: 'monday',
      start_time: '25:00',
      end_time: '20:00',
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('validates each nested slot in a bulk request', async () => {
    const dto = plainToInstance(BulkAvailabilityDto, {
      availabilities: [
        {
          day_of_week: 'monday',
          start_time: '18:00',
          end_time: '20:00',
        },
        {
          day_of_week: 'not-a-day',
          start_time: '18:00',
          end_time: '20:00',
        },
      ],
    });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it('accepts supported session durations and rejects unsupported values', async () => {
    const validDto = plainToInstance(BulkAvailabilityDto, {
      availabilities: [],
      session_duration_minutes: 30,
    });
    const invalidDto = plainToInstance(BulkAvailabilityDto, {
      availabilities: [],
      session_duration_minutes: 45,
    });

    expect(await validate(validDto)).toHaveLength(0);
    expect(await validate(invalidDto)).not.toHaveLength(0);
  });
});
