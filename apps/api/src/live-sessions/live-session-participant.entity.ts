import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LiveSession } from './live-session.entity';

@Entity('live_session_participants')
export class LiveSessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => LiveSession, (s) => s.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: LiveSession;

  @Column()
  sessionId: string;

  @Column()
  name: string;

  @Column({ default: 0 })
  unlockedPhaseIndex: number;

  @Column('simple-json', { nullable: true })
  unlockedPhaseIds: string[] | null;

  @Column({ default: true })
  isOnline: boolean;

  @Column({ nullable: true })
  socketId: string;

  @CreateDateColumn()
  connectedAt: Date;

  @Column({ nullable: true, type: 'datetime' })
  disconnectedAt: Date | null;
}
