import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Stage } from '../../stages/entities/stage.entity';
import { PriorityLevel, GoalStatus } from '../enums/goal.enum';

@Entity('GOAL')
export class Goal {
  @PrimaryGeneratedColumn()
  goal_id: number;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User, (user) => user.goals, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  user_description: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  start_date: Date;

  @Column({ type: 'date', nullable: true })
  due_date: Date;

  @Column({ type: 'enum', enum: PriorityLevel, default: PriorityLevel.MEDIUM })
  priority: PriorityLevel;

  @Column({ type: 'enum', enum: GoalStatus, default: GoalStatus.ACTIVE })
  status: GoalStatus;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at: Date;

  @OneToMany(() => Stage, (stage) => stage.goal)
  stages: Stage[];
}
