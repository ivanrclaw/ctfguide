import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('guides')
export class Guide {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text', { default: '' })
  description: string;

  @Column()
  ctfName: string;

  @Column()
  category: string;

  @Column({ default: 'beginner' })
  difficulty: string;

  @Column({ default: false })
  published: boolean;

  @ManyToOne(() => User, (user) => user.guides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}