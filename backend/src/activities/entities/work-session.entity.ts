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

@Entity('WORK_SESSION')
@Index('idx_work_session_activity_date', ['activity_id', 'session_date'])
export class WorkSession {
  @PrimaryGeneratedColumn()
  session_id: number;

  @Column({ name: 'activity_id' })
  activity_id: number;

  @ManyToOne(() => Activity, (activity) => activity.work_sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  session_date: string;

  @Column({ name: 'minutes_spent', type: 'int' })
  minutes_spent: number;

  @Column({ name: 'difficulty_level', type: 'smallint', nullable: true })
  difficulty_level: number | null;

  @Column({ name: 'difficulty_notes', type: 'text', nullable: true })
  difficulty_notes: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
