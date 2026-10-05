import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Goal } from '../../goals/entities/goal.entity';
import { Activity } from '../../activities/entities/activity.entity';

@Entity('STAGE')
export class Stage {
  @PrimaryGeneratedColumn()
  stage_id: number;

  @Column({ name: 'goal_id' })
  goal_id: number;

  @ManyToOne(() => Goal, (goal) => goal.stages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'goal_id' })
  goal: Goal;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'int' })
  sort_order: number;

  @Column({ type: 'date', nullable: true })
  estimated_start_date: Date;

  @Column({ type: 'date', nullable: true })
  estimated_end_date: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToMany(() => Activity, (activity) => activity.stage)
  activities: Activity[];
}
