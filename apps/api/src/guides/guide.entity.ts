import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Phase } from '../phases/phase.entity';
import { Invitation } from '../invitations/invitation.entity';

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

  @Column({ unique: true, nullable: true })
  slug: string;

  @ManyToOne(() => User, (user) => user.guides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: string;

  @OneToMany(() => Phase, (phase) => phase.guide, { eager: true, cascade: true })
  phases: Phase[];

  @OneToMany(() => Invitation, (invitation) => invitation.guide, { cascade: true })
  invitations: Invitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}