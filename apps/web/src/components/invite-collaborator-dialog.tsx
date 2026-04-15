import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createInvitation } from '../api/invitations';

interface InviteCollaboratorDialogProps {
  guideId: string;
  guideTitle: string;
  onSuccess?: () => void;
}

export function InviteCollaboratorDialog({ guideId, guideTitle, onSuccess }: InviteCollaboratorDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [sending, setSending] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      await createInvitation(guideId, identifier.trim());
      toast.success(t('collaboration.inviteSuccess'));
      setOpen(false);
      setIdentifier('');
      onSuccess?.();
    } catch (err) {
      toast.error(t('collaboration.inviteError'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          {t('collaboration.inviteCollaborator')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('collaboration.inviteCollaborator')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">{t('collaboration.identifierLabel')}</Label>
            <Input
              id="identifier"
              type="text"
              placeholder={t('collaboration.identifierPlaceholder')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            <p>{t('collaboration.inviteHint', { title: guideTitle })}</p>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              {t('collaboration.cancel')}
            </Button>
            <Button type="submit" disabled={sending || !identifier.trim()}>
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('collaboration.sending')}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t('collaboration.sendInvite')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}