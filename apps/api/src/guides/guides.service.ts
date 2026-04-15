import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guide } from './guide.entity';
import { CreateGuideDto, UpdateGuideDto } from './dto/create-guide.dto';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class GuidesService {
  constructor(
    @InjectRepository(Guide)
    private guidesRepository: Repository<Guide>,
    private readonly invitationsService: InvitationsService,
  ) {}

  async create(authorId: string, dto: CreateGuideDto): Promise<Guide> {
    const guide = this.guidesRepository.create({
      ...dto,
      authorId,
      difficulty: dto.difficulty || 'beginner',
    });
    return this.guidesRepository.save(guide);
  }

  async findAllByUser(authorId: string): Promise<Guide[]> {
    return this.guidesRepository.find({
      where: { authorId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, authorId: string): Promise<Guide> {
    const guide = await this.guidesRepository.findOne({ where: { id } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== authorId) throw new ForbiddenException('Not your guide');
    return guide;
  }

  async update(id: string, authorId: string, dto: UpdateGuideDto): Promise<Guide> {
    const guide = await this.guidesRepository.findOne({ where: { id } });
    if (!guide) throw new NotFoundException('Guide not found');
    const isAuthorized = guide.authorId === authorId || await this.invitationsService.isAuthorOrCollaborator(id, authorId);
    if (!isAuthorized) throw new ForbiddenException('Not your guide');
    Object.assign(guide, dto);
    return this.guidesRepository.save(guide);
  }

  async remove(id: string, authorId: string): Promise<void> {
    const guide = await this.findOne(id, authorId);
    await this.guidesRepository.remove(guide);
  }
}