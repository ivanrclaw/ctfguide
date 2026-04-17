import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Guide } from '../guides/guide.entity';
import { User } from '../users/user.entity';
import { LiveSessionParticipant } from './live-session-participant.entity';

export type LiveSessionStatus = 'waiting' | 'running' | 'finished';

@Entity('live_sessions')
export class LiveSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 6, unique: true })
  code: string;

  @ManyToOne(() => Guide, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guideId' })
  guide: Guide;

  @Column()
  guideId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column()
  hostId: string;

  @Column({ type: 'simple-enum', enum: ['waiting', 'running', 'finished'], default: 'waiting' })
  status: LiveSessionStatus;

  @OneToMany(() => LiveSessionParticipant, (p) => p.session, { cascade: true })
  participants: LiveSessionParticipant[];

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  finishedAt: Date;
}
