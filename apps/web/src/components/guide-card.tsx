import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, Globe } from 'lucide-react';

const categoryColors: Record<string, string> = {
  web: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  pwn: 'bg-red-500/10 text-red-500 border-red-500/20',
  reverse: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  crypto: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  forensics: 'bg-green-500/10 text-green-500 border-green-500/20',
  misc: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  osint: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
};

const difficultyColors: Record<string, string> = {
  beginner: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  easy: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  hard: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  insane: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const categoryKeyMap: Record<string, string> = {
  web: 'landing.categoryWeb',
  pwn: 'landing.categoryPwn',
  reverse: 'landing.categoryReverse',
  crypto: 'landing.categoryCrypto',
  forensics: 'landing.categoryForensics',
  misc: 'landing.categoryMisc',
  osint: 'landing.categoryOsint',
};

const difficultyKeyMap: Record<string, string> = {
  beginner: 'createGuide.difficultyBeginner',
  easy: 'createGuide.difficultyEasy',
  medium: 'createGuide.difficultyMedium',
  hard: 'createGuide.difficultyHard',
  insane: 'createGuide.difficultyInsane',
};

interface Guide {
  id: string;
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty: string;
  authorId: string;
  published: boolean;
  slug?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GuideCardProps {
  guide: Guide;
  onDelete: (id: string) => void;
}

export function GuideCard({ guide, onDelete }: GuideCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(`/editor/${guide.id}`)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-lg">{guide.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{guide.ctfName}</p>
        </div>
        <div className="flex items-center gap-1">
          {guide.published && (
            <Button variant="ghost" size="icon" className="text-green-500" title={t('guideCard.published')}>
              <Globe className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/editor/${guide.id}`);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(guide.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {guide.description && (
          <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{guide.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={categoryColors[guide.category] || ''}>
            {t(categoryKeyMap[guide.category] || guide.category)}
          </Badge>
          <Badge variant="outline" className={difficultyColors[guide.difficulty] || ''}>
            {t(difficultyKeyMap[guide.difficulty] || guide.difficulty)}
          </Badge>
          {!guide.published && (
            <Badge variant="secondary">{t('guideCard.draft')}</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}