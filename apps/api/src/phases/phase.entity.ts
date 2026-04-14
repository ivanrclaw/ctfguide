import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Guide } from '../guides/guide.entity';

@Entity('phases')
export class Phase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { default: '' })
  content: string;

  @Column({ default: '' })
  password: string;

  @Column({ default: 'none' })
  unlockType: string;

  @Column({ default: '' })
  question: string;

  @Column({ default: '' })
  answer: string;

  @Column()
  order: number;

  @ManyToOne(() => Guide, (guide) => guide.phases, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guideId' })
  guide: Guide;

  @Column()
  guideId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}