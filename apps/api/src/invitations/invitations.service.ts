import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invitation, InvitationStatus } from './invitation.entity';
import { User } from '../users/user.entity';
import { Guide } from '../guides/guide.entity';
import { CreateInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private invitationsRepository: Repository<Invitation>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Guide)
    private guidesRepository: Repository<Guide>,
  ) {}

  async createInvitation(
    createInvitationDto: CreateInvitationDto,
    inviterId: string,
  ): Promise<Invitation> {
    const { guideId, identifier } = createInvitationDto;

    // Verify the guide exists and the inviter is the author
    const guide = await this.guidesRepository.findOne({
      where: { id: guideId },
      relations: ['author'],
    });

    if (!guide) {
      throw new NotFoundException('Guide not found');
    }

    if (guide.authorId !== inviterId) {
      throw new ForbiddenException('Only the guide author can invite collaborators');
    }

    // Find user by email or username (the identifier field accepts either)
    const isEmail = identifier.includes('@');
    const invitedUser = await this.usersRepository.findOne({
      where: isEmail
        ? { email: identifier }
        : { username: identifier },
    });

    if (!invitedUser) {
      throw new NotFoundException(
        isEmail
          ? 'No user found with that email address'
          : 'No user found with that username',
      );
    }

    // Prevent inviting yourself
    if (invitedUser.id === inviterId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // Check if an invitation already exists for this user + guide
    const existingInvitation = await this.invitationsRepository.findOne({
      where: {
        guideId,
        invitedUserId: invitedUser.id,
        status: InvitationStatus.PENDING,
      },
    });

    if (existingInvitation) {
      throw new BadRequestException('An invitation has already been sent to this user for this guide');
    }

    // Check if already a collaborator
    const acceptedInvitation = await this.invitationsRepository.findOne({
      where: {
        guideId,
        invitedUserId: invitedUser.id,
        status: InvitationStatus.ACCEPTED,
      },
    });

    if (acceptedInvitation) {
      throw new BadRequestException('This user is already a collaborator on this guide');
    }

    // Create the invitation
    const invitation = this.invitationsRepository.create({
      guideId,
      invitedUserId: invitedUser.id,
      inviterId,
      identifier,
      status: InvitationStatus.PENDING,
    });

    const saved = await this.invitationsRepository.save(invitation);

    // Return with relations populated
    const result = await this.invitationsRepository.findOne({
      where: { id: saved.id },
      relations: ['guide', 'inviter', 'invitedUser'],
    });

    if (!result) {
      throw new NotFoundException('Invitation not found after creation');
    }

    return result;
  }

  async getUserInvitations(userId: string): Promise<Invitation[]> {
    return this.invitationsRepository.find({
      where: { invitedUserId: userId, status: InvitationStatus.PENDING },
      relations: ['guide', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['guide'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been processed');
    }

    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();

    return this.invitationsRepository.save(invitation);
  }

  async declineInvitation(invitationId: string, userId: string): Promise<Invitation> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('This invitation has already been processed');
    }

    invitation.status = InvitationStatus.DECLINED;
    invitation.declinedAt = new Date();

    return this.invitationsRepository.save(invitation);
  }

  async cancelInvitation(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.inviterId !== userId) {
      throw new ForbiddenException('Only the inviter can cancel an invitation');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Cannot cancel an already processed invitation');
    }

    await this.invitationsRepository.remove(invitation);
  }

  async getUserCollaboratedGuides(userId: string): Promise<Guide[]> {
    const invitations = await this.invitationsRepository.find({
      where: { invitedUserId: userId, status: InvitationStatus.ACCEPTED },
      relations: ['guide', 'guide.author'],
    });

    return invitations.map((invitation) => invitation.guide).filter(Boolean);
  }

  async getGuideCollaborators(guideId: string, authorId: string): Promise<Invitation[]> {
    // Verify ownership
    const guide = await this.guidesRepository.findOne({ where: { id: guideId } });
    if (!guide) throw new NotFoundException('Guide not found');
    if (guide.authorId !== authorId) throw new ForbiddenException('Only the guide author can view collaborators');

    return this.invitationsRepository.find({
      where: { guideId },
      relations: ['invitedUser', 'inviter'],
      order: { createdAt: 'DESC' },
    });
  }

  async removeCollaborator(invitationId: string, authorId: string): Promise<void> {
    const invitation = await this.invitationsRepository.findOne({
      where: { id: invitationId },
      relations: ['guide'],
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.guide.authorId !== authorId) throw new ForbiddenException('Only the guide author can remove collaborators');
    await this.invitationsRepository.remove(invitation);
  }

  async findOneAsCollaborator(guideId: string, userId: string): Promise<Guide> {
    const invitation = await this.invitationsRepository.findOne({
      where: { guideId, invitedUserId: userId, status: InvitationStatus.ACCEPTED },
      relations: ['guide'],
    });
    if (!invitation) throw new ForbiddenException('Not your guide');
    return invitation.guide;
  }
}