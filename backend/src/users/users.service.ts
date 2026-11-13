import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const { name, email, password } = createUserDto;

    // Verificar si el correo ya existe
    const existingUser = await this.usersRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Hashear la contraseña
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear y guardar el usuario
    const newUser = this.usersRepository.create({
      name,
      email,
      password_hash,
    });

    const savedUser = await this.usersRepository.save(newUser);
    
    // Devolver el usuario sin el hash de la contraseña por seguridad
    const { password_hash: _, ...result } = savedUser;
    return result as Omit<User, 'password_hash'>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // HU-49: Consultar preferencias del usuario (v_user_preferences)
  async getPreferences(userId: number): Promise<any> {
    const rows = await this.usersRepository.query(
      'SELECT * FROM v_user_preferences WHERE user_id = $1',
      [userId],
    );
    return (
      rows[0] || {
        user_id: userId,
        has_saved_preferences: false,
        reminders_enabled: true,
        reminder_minutes_before: 30,
        delay_alerts_enabled: true,
        periodic_summary_enabled: true,
        summary_frequency: 'weekly',
        summary_day_of_week: 'sunday',
        summary_time: '18:00',
        goals_sort_by: 'priority',
        timezone: 'America/La_Paz',
        session_duration_minutes: 60,
      }
    );
  }

  // HU-49: Guardar o actualizar preferencias del usuario
  async updatePreferences(userId: number, dto: UpdatePreferencesDto): Promise<any> {
    const current = await this.getPreferences(userId);
    const remindersEnabled =
      dto.reminders_enabled !== undefined ? dto.reminders_enabled : current.reminders_enabled;
    const reminderMinutesBefore =
      dto.reminder_minutes_before !== undefined
        ? dto.reminder_minutes_before
        : current.reminder_minutes_before;
    const delayAlertsEnabled =
      dto.delay_alerts_enabled !== undefined
        ? dto.delay_alerts_enabled
        : current.delay_alerts_enabled;
    const periodicSummaryEnabled =
      dto.periodic_summary_enabled !== undefined
        ? dto.periodic_summary_enabled
        : current.periodic_summary_enabled;
    const goalsSortBy = dto.goals_sort_by || current.goals_sort_by;
    const timezone = dto.timezone || current.timezone || 'America/La_Paz';

    await this.usersRepository.query(
      `INSERT INTO "USER_PREFERENCE" (user_id, reminders_enabled, reminder_minutes_before, delay_alerts_enabled, periodic_summary_enabled, goals_sort_by, timezone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         reminders_enabled = EXCLUDED.reminders_enabled,
         reminder_minutes_before = EXCLUDED.reminder_minutes_before,
         delay_alerts_enabled = EXCLUDED.delay_alerts_enabled,
         periodic_summary_enabled = EXCLUDED.periodic_summary_enabled,
         goals_sort_by = EXCLUDED.goals_sort_by,
         timezone = EXCLUDED.timezone,
         updated_at = CURRENT_TIMESTAMP;`,
      [
        userId,
        remindersEnabled,
        reminderMinutesBefore,
        delayAlertsEnabled,
        periodicSummaryEnabled,
        goalsSortBy,
        timezone,
      ],
    );

    if (dto.session_duration_minutes !== undefined) {
      await this.usersRepository.query(
        `INSERT INTO "USER_AVAILABILITY_PREFERENCE" (user_id, session_duration_minutes)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET
           session_duration_minutes = EXCLUDED.session_duration_minutes;`,
        [userId, dto.session_duration_minutes],
      );
    }

    return this.getPreferences(userId);
  }
}
