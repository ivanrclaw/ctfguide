import { api } from '../lib/api';

export interface Invitation {
  id: string;
  guideId: string;
  guide: {
    id: string;
    title: string;
    ctfName: string;
  };
  invitedUserId: string;
  inviterId: string;
  inviter: {
    username: string;
    email: string;
  };
  identifier: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  acceptedAt?: string;
  declinedAt?: string;
}

export async function createInvitation(
  guideId: string,
  identifier: string,
): Promise<Invitation> {
  return api.post<Invitation>('/invitations', { guideId, identifier });
}

export async function getMyInvitations(): Promise<Invitation[]> {
  return api.get<Invitation[]>('/invitations/my');
}

export async function acceptInvitation(invitationId: string): Promise<Invitation> {
  return api.put<Invitation>(`/invitations/${invitationId}/accept`, {});
}

export async function declineInvitation(invitationId: string): Promise<Invitation> {
  return api.put<Invitation>(`/invitations/${invitationId}/decline`, {});
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  await api.delete(`/invitations/${invitationId}`);
}

export async function getMyCollaboratedGuides(): Promise<any[]> {
  return api.get<any[]>('/invitations/collaborated');
}