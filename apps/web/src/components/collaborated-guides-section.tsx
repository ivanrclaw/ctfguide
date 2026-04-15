import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { getMyCollaboratedGuides } from '../api/invitations';
import { Users } from 'lucide-react';

interface CollaboratedGuide {
  id: string;
  title: string;
  ctfName: string;
  author: {
    username: string;
  };
  createdAt: string;
}

export function CollaboratedGuidesSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [collaboratedGuides, setCollaboratedGuides] = useState<CollaboratedGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCollaboratedGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getMyCollaboratedGuides();
      setCollaboratedGuides(response);
    } catch (err) {
      setError(t('collaboration.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollaboratedGuides();
  }, []);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        <h2 className="text-xl font-semibold">{t('collaboration.myCollaboratedGuides')}</h2>
      </div>

      {loading ? (
        <div className="text-gray-500">{t('collaboration.loading')}</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : collaboratedGuides.length === 0 ? (
        <div className="text-gray-500">{t('collaboration.noCollaboratedGuides')}</div>
      ) : (
        <div className="grid gap-4">
          {collaboratedGuides.map((guide) => (
            <div
              key={guide.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer"
              onClick={() => navigate(`/editor/${guide.id}`)}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {guide.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  <span>{guide.author.username}</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {guide.ctfName}
              </p>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {t('collaboration.createdAt', { date: new Date(guide.createdAt).toLocaleDateString() })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}