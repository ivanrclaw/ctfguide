import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  UserPlus,
  Users,
  Loader2,
  X,
  Check,
  Clock,
  UserX,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { cancelInvitation } from '../api/invitations';

interface Collaborator {
  id: string;
  guideId: string;
  invitedUserId: string;
  inviterId: string;
  identifier: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  invitedUser: {
    id: string;
    username: string;
    email: string;
  };
  inviter: {
    id: string;
    username: string;
  };
}

interface CollaboratorsPanelProps {
  guideId: string;
  onInviteSent?: () => void;
}

export function CollaboratorsPanel({ guideId, onInviteSent }: CollaboratorsPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);

  const fetchCollaborators = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const data = await api.get<Collaborator[]>(`/invitations/guide/${guideId}`);
      setCollaborators(data);
    } catch {
      toast.error(t('collaboration.loadError'));
    } finally {
      setLoading(false);
    }
  }, [guideId, open, t]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/invitations', { guideId, identifier: identifier.trim() });
      toast.success(t('collaboration.inviteSuccess'));
      setIdentifier('');
      fetchCollaborators();
      onInviteSent?.();
    } catch {
      toast.error(t('collaboration.inviteError'));
    } finally {
      setSending(false);
    }
  };

  const handleRemoveCollaborator = async (invitationId: string) => {
    try {
      await api.delete(`/invitations/${invitationId}/collaborator`);
      toast.success(t('collaboration.removeSuccess'));
      fetchCollaborators();
    } catch {
      toast.error(t('collaboration.removeError'));
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      toast.success(t('collaboration.cancelInviteSuccess'));
      fetchCollaborators();
    } catch {
      toast.error(t('collaboration.cancelInviteError'));
    }
  };

  const accepted = collaborators.filter((c) => c.status === 'accepted');
  const pending = collaborators.filter((c) => c.status === 'pending');
  const declined = collaborators.filter((c) => c.status === 'declined');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="mr-2 h-4 w-4" />
          {t('collaboration.manageCollaborators')}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('collaboration.manageCollaborators')}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Invite form */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t('collaboration.inviteCollaborator')}</h3>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="collab-identifier" className="text-xs">
                  {t('collaboration.identifierLabel')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="collab-identifier"
                    type="text"
                    placeholder={t('collaboration.identifierPlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={sending || !identifier.trim()}>
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>

          {/* Collaborator lists */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('collaboration.loading')}
            </div>
          ) : (
            <>
              {/* Accepted */}
              {accepted.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
                    <Check className="h-4 w-4" />
                    {t('collaboration.acceptedCollaborators')} ({accepted.length})
                  </h3>
                  {accepted.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2"
                    >
                      <div>
                        <span className="font-medium text-sm">{c.invitedUser?.username || c.identifier}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.invitedUser?.email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCollaborator(c.id)}
                        title={t('collaboration.removeCollaborator')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Pending */}
              {pending.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                    {t('collaboration.pendingInvitations')} ({pending.length})
                  </h3>
                  {pending.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2"
                    >
                      <div>
                        <span className="font-medium text-sm">{c.invitedUser?.username || c.identifier}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.invitedUser?.email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleCancelInvitation(c.id)}
                        title={t('collaboration.cancelInvitation')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Declined */}
              {declined.length > 0 && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                    <UserX className="h-4 w-4" />
                    {t('collaboration.declinedInvitations')} ({declined.length})
                  </h3>
                  {declined.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 opacity-60"
                    >
                      <div>
                        <span className="font-medium text-sm line-through">{c.invitedUser?.username || c.identifier}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{c.invitedUser?.email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCollaborator(c.id)}
                        title={t('collaboration.removeInvitation')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {collaborators.length === 0 && (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p>{t('collaboration.noCollaboratorsYet')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}