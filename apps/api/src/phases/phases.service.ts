import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Phase } from './phase.entity';
import { Guide } from '../guides/guide.entity';
import { CreatePhaseDto, UpdatePhaseDto, ReorderPhasesDto } from './dto/phase.dto';
import * as crypto from 'crypto';

@Injectable()
export class PhasesService {
  constructor(
    @InjectRepository(Phase)
    private phasesRepository: Repository<Phase>,
    @InjectRepository(Guide)
    private guidesRepository: Repository<Guide>,
  ) {}

  async create(userId: string, guideId: string, dto: CreatePhaseDto): Promise<Phase> {
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    const phase = this.phasesRepository.create({
      ...dto,
      guideId,
      password: dto.password || '',
    });
    return this.phasesRepository.save(phase);
  }

  async findByGuide(userId: string, guideId: string): Promise<Phase[]> {
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    return this.phasesRepository.find({
      where: { guideId },
      order: { order: 'ASC' },
    });
  }

  async findOne(userId: string, phaseId: string): Promise<Phase> {
    const phase = await this.phasesRepository.findOne({ where: { id: phaseId } });
    if (!phase) throw new NotFoundException('Phase not found');

    const guide = await this.guidesRepository.findOne({ where: { id: phase.guideId } });
    if (!guide || guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    return phase;
  }

  async update(userId: string, phaseId: string, dto: UpdatePhaseDto): Promise<Phase> {
    const phase = await this.phasesRepository.findOne({ where: { id: phaseId } });
    if (!phase) throw new NotFoundException('Phase not found');

    const guide = await this.guidesRepository.findOne({ where: { id: phase.guideId } });
    if (!guide || guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    Object.assign(phase, dto);
    return this.phasesRepository.save(phase);
  }

  async remove(userId: string, phaseId: string): Promise<void> {
    const phase = await this.phasesRepository.findOne({ where: { id: phaseId } });
    if (!phase) throw new NotFoundException('Phase not found');

    const guide = await this.guidesRepository.findOne({ where: { id: phase.guideId } });
    if (!guide || guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    await this.phasesRepository.remove(phase);
  }

  async reorder(userId: string, guideId: string, dto: ReorderPhasesDto): Promise<Phase[]> {
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    for (let i = 0; i < dto.phaseIds.length; i++) {
      await this.phasesRepository.update(
        { id: dto.phaseIds[i], guideId },
        { order: i },
      );
    }

    return this.phasesRepository.find({
      where: { guideId },
      order: { order: 'ASC' },
    });
  }

  async verifyPassword(phaseId: string, password: string): Promise<{ valid: boolean }> {
    const phase = await this.phasesRepository.findOne({ where: { id: phaseId } });
    if (!phase) throw new NotFoundException('Phase not found');

    if (!phase.password) return { valid: true };

    return { valid: phase.password === password };
  }

  // Public view: returns phases for a published guide, without passwords
  async findPublicByGuide(slug: string): Promise<{ guide: Guide; phases: Phase[] }> {
    const guide = await this.guidesRepository.findOne({
      where: { slug },
      relations: ['phases', 'author'],
    });
    if (!guide) throw new NotFoundException('Guide not found');
    if (!guide.published) throw new NotFoundException('Guide not found');

    const phases = guide.phases
      .sort((a, b) => a.order - b.order);

    // Strip passwords from response
    const safePhases = phases.map(({ password, ...rest }) => ({
      ...rest,
      hasPassword: !!password,
    })) as any;

    return {
      guide: {
        ...guide,
        phases: undefined,
      } as any,
      phases: safePhases,
    };
  }

  async generateSlug(guideId: string, userId: string): Promise<string> {
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    const slug = crypto.randomBytes(6).toString('base64url');
    guide.slug = slug;
    guide.published = true;
    await this.guidesRepository.save(guide);
    return slug;
  }

  async unpublish(guideId: string, userId: string): Promise<void> {
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== userId) throw new ForbiddenException('Not your guide');

    guide.published = false;
    guide.slug = null as any;
    await this.guidesRepository.save(guide);
  }
}