import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Activity } from './activity.entity';
import { ScheduleReason } from '../enums/schedule-reason.enum';

@Entity('ACTIVITY_SCHEDULE')
@Index(['activity_id', 'version_number'], { unique: true })
@Index(['scheduled_date'])
export class ActivitySchedule {
  @PrimaryGeneratedColumn()
  schedule_id: number;

  @Column({ name: 'activity_id' })
  activity_id: number;

  @ManyToOne(() => Activity, (activity) => activity.schedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ name: 'recommendation_id', nullable: true })
  recommendation_id: number;

  @Column({ type: 'int', default: 1 })
  version_number: number;

  @Column({ type: 'date' })
  scheduled_date: string;

  @Column({ type: 'time', nullable: true })
  start_time: string;

  @Column({ type: 'time', nullable: true })
  end_time: string;

  @Column({
    type: 'enum',
    enum: ScheduleReason,
    default: ScheduleReason.INITIAL_PLAN,
  })
  reason: ScheduleReason;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
