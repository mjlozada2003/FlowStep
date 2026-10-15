import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Stage } from '../../stages/entities/stage.entity';
import { ActivityType, ActivityStatus, ActivityOrigin } from '../enums/activity.enum';
import { PriorityLevel } from '../../goals/enums/goal.enum';

@Entity('ACTIVITY')
export class Activity {
  @PrimaryGeneratedColumn()
  activity_id: number;

  @Column({ name: 'stage_id' })
  stage_id: number;

  @ManyToOne(() => Stage, (stage) => stage.activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_id' })
  stage: Stage;

  @Column({ name: 'parent_activity_id', nullable: true })
  parent_activity_id: number;

  @ManyToOne(() => Activity, (activity) => activity.sub_activities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_activity_id' })
  parent_activity: Activity;

  @OneToMany(() => Activity, (activity) => activity.parent_activity)
  sub_activities: Activity[];

  @Column({ name: 'origin_recommendation_id', nullable: true })
  origin_recommendation_id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ActivityType })
  type: ActivityType;

  @Column({ type: 'enum', enum: PriorityLevel, default: PriorityLevel.MEDIUM })
  priority: PriorityLevel;

  @Column({ type: 'enum', enum: ActivityStatus, default: ActivityStatus.PENDING })
  status: ActivityStatus;

  @Column({ type: 'enum', enum: ActivityOrigin, default: ActivityOrigin.INITIAL_PLAN })
  origin: ActivityOrigin;

  @Column({ type: 'int', default: 1 })
  sort_order: number;

  @Column({ type: 'int', nullable: true })
  estimated_minutes: number;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}
