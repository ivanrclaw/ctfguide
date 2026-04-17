import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebSocket } from '../contexts/websocket-context';
import { Bell, X, Check, XCircle } from 'lucide-react';
import { acceptInvitation, declineInvitation, getMyInvitations } from '../api/invitations';

interface Invitation {
  id: string;
  guide: {
    id: string;
    title: string;
    ctfName: string;
  };
  inviter: {
    username: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export function InvitationNotification() {
  const { t } = useTranslation();
  const { socket } = useWebSocket();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyInvitations();
      setInvitations(data);
    } catch (err) {
      setError(t('collaboration.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('invitation:new', loadInvitations);
      socket.on('invitation:accepted', loadInvitations);
      socket.on('invitation:declined', loadInvitations);

      return () => {
        socket.off('invitation:new', loadInvitations);
        socket.off('invitation:accepted', loadInvitations);
        socket.off('invitation:declined', loadInvitations);
      };
    }
  }, [socket]);

  const handleAccept = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      alert(t('collaboration.acceptSuccess'));
    } catch (err) {
      alert(t('collaboration.acceptError'));
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      await declineInvitation(invitationId);
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      alert(t('collaboration.declineError'));
    }
  };

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending');

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <Bell className="h-4 w-4" />
        {pendingInvitations.length > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {pendingInvitations.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {t('collaboration.invitations')}
            </h3>
          </div>

          {loading ? (
            <div className="p-4 text-center text-gray-500">{t('collaboration.loading')}</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">{error}</div>
          ) : pendingInvitations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {t('collaboration.noPendingInvitations')}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {invitation.guide.title}
                    </h4>
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('collaboration.invitedBy', { username: invitation.inviter.username })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(invitation.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      {t('collaboration.accept')}
                    </button>
                    <button
                      onClick={() => handleDecline(invitation.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {t('collaboration.decline')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {invitations.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowDropdown(false)}
                className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                {t('collaboration.close')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}