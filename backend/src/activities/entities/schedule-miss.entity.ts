import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ActivitySchedule } from './activity-schedule.entity';
import { MissReason } from './miss-reason.entity';

@Entity('SCHEDULE_MISS')
export class ScheduleMiss {
  @PrimaryGeneratedColumn()
  miss_id: number;

  @Column({ name: 'schedule_id', unique: true })
  @Index({ unique: true })
  schedule_id: number;

  @OneToOne(() => ActivitySchedule, (schedule) => schedule.miss, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ActivitySchedule;

  @Column({ name: 'reason_id' })
  reason_id: number;

  @ManyToOne(() => MissReason, (reason) => reason.misses)
  @JoinColumn({ name: 'reason_id' })
  reason: MissReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  recorded_at: Date;
}
