import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('USER_AVAILABILITY_PREFERENCE')
@Check(
  'chk_user_availability_session_duration',
  '"session_duration_minutes" IN (30, 60, 120)',
)
export class AvailabilityPreference {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'int', default: 60 })
  session_duration_minutes: number;
}
