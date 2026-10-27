import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Availability } from './entities/availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Availability)
    private availabilityRepository: Repository<Availability>,
  ) {}

  private validateTimeRange(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException(
        `La hora de fin (${endTime}) debe ser posterior a la hora de inicio (${startTime})`,
      );
    }
  }

  async create(userId: number, dto: CreateAvailabilityDto): Promise<Availability> {
    this.validateTimeRange(dto.start_time, dto.end_time);

    // Verificar si ya existe una franja con la misma hora de inicio para el mismo día
    const existing = await this.availabilityRepository.findOne({
      where: {
        user_id: userId,
        day_of_week: dto.day_of_week,
        start_time: dto.start_time,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una franja de disponibilidad registrada para el ${dto.day_of_week} a las ${dto.start_time}`,
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

  async bulkSet(userId: number, dtos: CreateAvailabilityDto[]): Promise<Availability[]> {
    for (const dto of dtos) {
      this.validateTimeRange(dto.start_time, dto.end_time);
    }

    // Reemplaza la disponibilidad semanal en lote
    await this.availabilityRepository.delete({ user_id: userId });

    const newSlots = dtos.map((dto) =>
      this.availabilityRepository.create({
        user_id: userId,
        day_of_week: dto.day_of_week,
        start_time: dto.start_time,
        end_time: dto.end_time,
      }),
    );

    return this.availabilityRepository.save(newSlots);
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
