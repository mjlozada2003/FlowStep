import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ScheduleMiss } from './schedule-miss.entity';

@Entity('MISS_REASON')
export class MissReason {
  @PrimaryGeneratedColumn()
  reason_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @OneToMany(() => ScheduleMiss, (miss) => miss.reason)
  misses: ScheduleMiss[];
}
