import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Availability } from './entities/availability.entity';
import { AvailabilityPreference } from './entities/availability-preference.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private availabilityRepository: Repository<Availability>,
    @InjectRepository(AvailabilityPreference)
    private preferenceRepository: Repository<AvailabilityPreference>,
  ) {}

  private validateTimeRange(startTime: string, endTime: string): void {
    if (this.toSeconds(startTime) >= this.toSeconds(endTime)) {
      throw new BadRequestException(
        `La hora de fin (${endTime}) debe ser posterior a la hora de inicio (${startTime})`,
      );
    }
  }

  private toSeconds(time: string): number {
    const [hours, minutes, seconds = '0'] = time.split(':');
    return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
  }

  private overlaps(
    startTime: string,
    endTime: string,
    otherStartTime: string,
    otherEndTime: string,
  ): boolean {
    return (
      this.toSeconds(startTime) < this.toSeconds(otherEndTime) &&
      this.toSeconds(otherStartTime) < this.toSeconds(endTime)
    );
  }

  private validateNoOverlaps(
    slots: Pick<CreateAvailabilityDto, 'day_of_week' | 'start_time' | 'end_time'>[],
  ): void {
    for (let index = 0; index < slots.length; index += 1) {
      const current = slots[index];
      this.validateTimeRange(current.start_time, current.end_time);
      for (let otherIndex = 0; otherIndex < index; otherIndex += 1) {
        const previous = slots[otherIndex];
        if (
          current.day_of_week === previous.day_of_week &&
          this.overlaps(
            current.start_time,
            current.end_time,
            previous.start_time,
            previous.end_time,
          )
        ) {
          throw new ConflictException(
            `Las franjas de disponibilidad del ${current.day_of_week} no pueden superponerse`,
          );
        }
      }
    }
  }

  async create(userId: number, dto: CreateAvailabilityDto): Promise<Availability> {
    this.validateTimeRange(dto.start_time, dto.end_time);

    const existing = await this.availabilityRepository.find({
      where: { user_id: userId, day_of_week: dto.day_of_week },
    });

    if (
      existing.some((slot) =>
        this.overlaps(dto.start_time, dto.end_time, slot.start_time, slot.end_time),
      )
    ) {
      throw new ConflictException(
        `La franja de disponibilidad del ${dto.day_of_week} se superpone con otra franja`,
      );
    }

    const availability = this.availabilityRepository.create({
      user_id: userId,
      day_of_week: dto.day_of_week,
      start_time: dto.start_time,
      end_time: dto.end_time,
    });

    return this.availabilityRepository.save(availability);
  }

  async bulkSet(
    userId: number,
    dtos: CreateAvailabilityDto[],
    sessionDurationMinutes?: number,
  ): Promise<Availability[]> {
    this.validateNoOverlaps(dtos);
    const newSlots = dtos.map((dto) =>
      this.availabilityRepository.create({
        user_id: userId,
        day_of_week: dto.day_of_week,
        start_time: dto.start_time,
        end_time: dto.end_time,
      }),
    );

    return this.availabilityRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Availability);
      await repository.delete({ user_id: userId });
      const savedSlots = await repository.save(newSlots);
      if (sessionDurationMinutes !== undefined) {
        await manager.getRepository(AvailabilityPreference).save({
          user_id: userId,
          session_duration_minutes: sessionDurationMinutes,
        });
      }
      return savedSlots;
    });
  }

  async getPreferences(
    userId: number,
  ): Promise<Pick<AvailabilityPreference, 'user_id' | 'session_duration_minutes'>> {
    const preference = await this.preferenceRepository.findOne({
      where: { user_id: userId },
    });
    return preference ?? {
      user_id: userId,
      session_duration_minutes: 60,
    };
  }

  async findAllByUser(userId: number): Promise<Availability[]> {
    return this.availabilityRepository.find({
      where: { user_id: userId },
      order: {
        day_of_week: 'ASC',
        start_time: 'ASC',
      },
    });
  }

  async remove(userId: number, availabilityId: number): Promise<{ message: string }> {
    const slot = await this.availabilityRepository.findOne({
      where: {
        availability_id: availabilityId,
        user_id: userId,
      },
    });

    if (!slot) {
      throw new NotFoundException(
        `Franja de disponibilidad con ID ${availabilityId} no encontrada`,
      );
    }

    await this.availabilityRepository.remove(slot);
    return { message: `Franja de disponibilidad eliminada correctamente` };
  }
}
