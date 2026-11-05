import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { ActivityStatus } from '../enums/activity.enum';

@Entity('ACTIVITY_STATUS_HISTORY')
@Index('IDX_ACTIVITY_STATUS_HISTORY_ACTIVITY_CHANGED', ['activity_id', 'changed_at'])
export class ActivityStatusHistory {
  @PrimaryGeneratedColumn()
  activity_status_history_id: number;

  @Column({ name: 'activity_id' })
  activity_id: number;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ type: 'enum', enum: ActivityStatus, enumName: 'ACTIVITY_status_enum' })
  previous_status: ActivityStatus;

  @Column({ type: 'enum', enum: ActivityStatus, enumName: 'ACTIVITY_status_enum' })
  new_status: ActivityStatus;

  @Column({ type: 'timestamp', nullable: true })
  previous_completed_at: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  changed_at: Date;
}
