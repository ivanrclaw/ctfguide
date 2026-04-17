import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession, LiveSessionStatus } from './live-session.entity';
import { LiveSessionParticipant } from './live-session-participant.entity';
import { Guide } from '../guides/guide.entity';
import { Phase } from '../phases/phase.entity';
import { PhasesService } from '../phases/phases.service';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class LiveSessionsService {
  constructor(
    @InjectRepository(LiveSession)
    private sessionsRepository: Repository<LiveSession>,
    @InjectRepository(LiveSessionParticipant)
    private participantsRepository: Repository<LiveSessionParticipant>,
    @InjectRepository(Guide)
    private guidesRepository: Repository<Guide>,
    @InjectRepository(Phase)
    private phasesRepository: Repository<Phase>,
    private readonly phasesService: PhasesService,
    private readonly invitationsService: InvitationsService,
  ) {}

  // Generate a random 6-character alphanumeric code
  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createSession(guideId: string, hostId: string): Promise<LiveSession> {
    const guide = await this.guidesRepository.findOne({
      where: { id: guideId },
    });
    if (!guide) throw new NotFoundException('Guide not found');

    const isAuthorized = guide.authorId === hostId ||
      await this.invitationsService.isAuthorOrCollaborator(guideId, hostId);
    if (!isAuthorized) throw new ForbiddenException('Not authorized for this guide');

    // Check if there's already an active session for this guide
    const existingActive = await this.sessionsRepository.findOne({
      where: { guideId, status: 'waiting' },
    });
    if (existingActive) {
      // Return the existing waiting session
      return existingActive;
    }

    // Generate a unique code
    let code = this.generateCode();
    let existing = await this.sessionsRepository.findOne({ where: { code } });
    while (existing) {
      code = this.generateCode();
      existing = await this.sessionsRepository.findOne({ where: { code } });
    }

    const session = this.sessionsRepository.create({
      code,
      guideId,
      hostId,
      status: 'waiting',
    });

    return this.sessionsRepository.save(session);
  }

  async getSession(sessionId: string, userId: string): Promise<LiveSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['guide', 'host'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const isAuthorized = await this.invitationsService.isAuthorOrCollaborator(session.guideId, userId);
    if (!isAuthorized) throw new ForbiddenException('Not authorized');

    return session;
  }

  async getSessionByCode(code: string): Promise<LiveSession> {
    const session = await this.sessionsRepository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['guide', 'guide.author', 'guide.phases'],
    });
    if (!session) throw new NotFoundException('Session not found');

    return session;
  }

  async startSession(sessionId: string, userId: string): Promise<LiveSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['guide'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const isAuthorized = await this.invitationsService.isAuthorOrCollaborator(session.guideId, userId);
    if (!isAuthorized) throw new ForbiddenException('Not authorized');

    if (session.status !== 'waiting') {
      throw new BadRequestException('Session already started or finished');
    }

    session.status = 'running';
    session.startedAt = new Date();
    return this.sessionsRepository.save(session);
  }

  async finishSession(sessionId: string, userId: string): Promise<LiveSession> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    const isAuthorized = await this.invitationsService.isAuthorOrCollaborator(session.guideId, userId);
    if (!isAuthorized) throw new ForbiddenException('Not authorized');

    session.status = 'finished';
    session.finishedAt = new Date();
    return this.sessionsRepository.save(session);
  }

  // Public: join session
  async joinSession(code: string, name: string): Promise<LiveSessionParticipant> {
    const session = await this.getSessionByCode(code);

    if (session.status === 'finished') {
      throw new BadRequestException('This session has ended');
    }

    if (session.status === 'running') {
      throw new BadRequestException('Session has already started. Cannot join at this time.');
    }

    // Check if already joined with this name
    const existing = await this.participantsRepository.findOne({
      where: { sessionId: session.id, name, isOnline: true },
    });
    if (existing) {
      return existing;
    }

    const participant = this.participantsRepository.create({
      sessionId: session.id,
      name,
      unlockedPhaseIndex: 0,
      unlockedPhaseIds: [],
      isOnline: true,
    });

    return this.participantsRepository.save(participant);
  }

  // Public: reconnect to session
  async reconnectSession(code: string, name: string): Promise<LiveSessionParticipant | null> {
    const session = await this.getSessionByCode(code);

    if (session.status === 'finished') {
      throw new BadRequestException('This session has ended');
    }

    const participant = await this.participantsRepository.findOne({
      where: { sessionId: session.id, name },
    });

    if (!participant) {
      return null;
    }

    participant.isOnline = true;
    participant.disconnectedAt = null;
    return this.participantsRepository.save(participant);
  }

  // Public: submit phase answer
  async submitPhaseAnswer(
    code: string,
    name: string,
    phaseId: string,
    password?: string,
    answer?: string,
  ): Promise<{ valid: boolean; participant: LiveSessionParticipant }> {
    const session = await this.getSessionByCode(code);

    if (session.status !== 'running') {
      throw new BadRequestException('Session is not running');
    }

    const participant = await this.participantsRepository.findOne({
      where: { sessionId: session.id, name },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found in this session');
    }

    // Check if already unlocked
    const unlockedIds = participant.unlockedPhaseIds || [];
    if (unlockedIds.includes(phaseId)) {
      return { valid: true, participant };
    }

    // Verify the answer
    const result = await this.phasesService.verify(phaseId, password, answer);

    if (result.valid) {
      // Unlock this phase
      unlockedIds.push(phaseId);

      // Get all phases sorted by order to calculate new index
      const phases = await this.phasesRepository.find({
        where: { guideId: session.guideId },
        order: { order: 'ASC' },
      });

      // Count how many phases from the start are now unlocked
      let newIndex = 0;
      for (const phase of phases) {
        if (unlockedIds.includes(phase.id)) {
          newIndex++;
        } else {
          break;
        }
      }

      participant.unlockedPhaseIds = unlockedIds;
      participant.unlockedPhaseIndex = newIndex;
      await this.participantsRepository.save(participant);
    }

    return { valid: result.valid, participant };
  }

  // Public: get participant progress
  async getParticipantProgress(code: string, name: string): Promise<LiveSessionParticipant> {
    const session = await this.getSessionByCode(code);
    const participant = await this.participantsRepository.findOne({
      where: { sessionId: session.id, name },
    });
    if (!participant) throw new NotFoundException('Participant not found');
    return participant;
  }

  // Get session stats for host
  async getSessionStats(sessionId: string, userId: string): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['guide', 'guide.phases'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const isAuthorized = await this.invitationsService.isAuthorOrCollaborator(session.guideId, userId);
    if (!isAuthorized) throw new ForbiddenException('Not authorized');

    const participants = await this.participantsRepository.find({
      where: { sessionId },
      order: { unlockedPhaseIndex: 'DESC', name: 'ASC' },
    });

    const totalPhases = session.guide.phases.filter((p) => p.unlockType !== 'none').length;

    const stats = {
      sessionId: session.id,
      code: session.code,
      status: session.status,
      totalPhases,
      totalParticipants: participants.length,
      onlineParticipants: participants.filter((p) => p.isOnline).length,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        isOnline: p.isOnline,
        unlockedPhaseIndex: p.unlockedPhaseIndex,
        unlockedCount: (p.unlockedPhaseIds || []).length,
        progress: totalPhases > 0 ? Math.round(((p.unlockedPhaseIds || []).length / totalPhases) * 100) : 100,
        connectedAt: p.connectedAt,
      })),
    };

    return stats;
  }

  // Disconnect participant (when socket disconnects)
  async disconnectParticipant(socketId: string): Promise<void> {
    const participant = await this.participantsRepository.findOne({
      where: { socketId, isOnline: true },
    });
    if (participant) {
      participant.isOnline = false;
      participant.disconnectedAt = new Date();
      await this.participantsRepository.save(participant);
    }
  }

  // Update participant socket ID
  async updateParticipantSocket(participantId: string, socketId: string): Promise<void> {
    await this.participantsRepository.update(
      { id: participantId },
      { socketId, isOnline: true, disconnectedAt: null },
    );
  }

  // Get session stats for projector view (no auth needed)
  async getSessionStatsForProjector(sessionId: string): Promise<any> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['guide', 'guide.phases'],
    });
    if (!session) throw new NotFoundException('Session not found');

    const participants = await this.participantsRepository.find({
      where: { sessionId },
      order: { unlockedPhaseIndex: 'DESC', name: 'ASC' },
    });

    const totalPhases = session.guide.phases.filter((p) => p.unlockType !== 'none').length;

    return {
      sessionId: session.id,
      code: session.code,
      status: session.status,
      title: session.guide.title,
      ctfName: session.guide.ctfName,
      category: session.guide.category,
      difficulty: session.guide.difficulty,
      totalPhases,
      totalParticipants: participants.length,
      onlineParticipants: participants.filter((p) => p.isOnline).length,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        isOnline: p.isOnline,
        unlockedCount: (p.unlockedPhaseIds || []).length,
        progress: totalPhases > 0 ? Math.round(((p.unlockedPhaseIds || []).length / totalPhases) * 100) : 100,
      })),
    };
  }

  // Get projector info by code (public, no auth)
  async getProjectorInfoByCode(code: string): Promise<any> {
    const session = await this.getSessionByCode(code);
    const participants = await this.participantsRepository.find({
      where: { sessionId: session.id },
      order: { unlockedPhaseIndex: 'DESC', name: 'ASC' },
    });

    const totalPhases = (session.guide.phases || []).filter((p) => p.unlockType !== 'none').length;

    return {
      sessionId: session.id,
      code: session.code,
      status: session.status,
      title: session.guide.title,
      ctfName: session.guide.ctfName,
      category: session.guide.category,
      difficulty: session.guide.difficulty,
      totalPhases,
      totalParticipants: participants.length,
      onlineParticipants: participants.filter((p) => p.isOnline).length,
      participants: participants.map((p) => ({
        name: p.name,
        isOnline: p.isOnline,
        unlockedCount: (p.unlockedPhaseIds || []).length,
        progress: totalPhases > 0 ? Math.round(((p.unlockedPhaseIds || []).length / totalPhases) * 100) : 100,
      })),
    };
  }
}
