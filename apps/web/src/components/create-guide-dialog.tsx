import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const CATEGORIES = ['web', 'pwn', 'reverse', 'crypto', 'forensics', 'misc', 'osint'] as const;
const DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard', 'insane'] as const;

const categoryKeyMap: Record<string, string> = {
  web: 'createGuide.categoryWeb',
  pwn: 'createGuide.categoryPwn',
  reverse: 'createGuide.categoryReverse',
  crypto: 'createGuide.categoryCrypto',
  forensics: 'createGuide.categoryForensics',
  misc: 'createGuide.categoryMisc',
  osint: 'createGuide.categoryOsint',
};

const difficultyKeyMap: Record<string, string> = {
  beginner: 'createGuide.difficultyBeginner',
  easy: 'createGuide.difficultyEasy',
  medium: 'createGuide.difficultyMedium',
  hard: 'createGuide.difficultyHard',
  insane: 'createGuide.difficultyInsane',
};

interface CreateGuideDialogProps {
  onCreated: () => void;
}

export function CreateGuideDialog({ onCreated }: CreateGuideDialogProps) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    ctfName: '',
    category: 'web' as string,
    difficulty: 'beginner' as string,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.ctfName) {
      toast.error(t('createGuide.errorTitleRequired'));
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/guides', form);
      toast.success(t('createGuide.successCreated'));
      setOpen(false);
      setForm({ title: '', description: '', ctfName: '', category: 'web', difficulty: 'beginner' });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('createGuide.errorCreateFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> {t('createGuide.newGuide')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createGuide.title')}</DialogTitle>
          <DialogDescription>{t('createGuide.subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t('createGuide.titleLabel')}</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('createGuide.titlePlaceholder')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctfName">{t('createGuide.ctfNameLabel')}</Label>
              <Input id="ctfName" value={form.ctfName} onChange={(e) => setForm({ ...form, ctfName: e.target.value })} placeholder={t('createGuide.ctfNamePlaceholder')} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('createGuide.descriptionLabel')}</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('createGuide.descriptionPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('createGuide.categoryLabel')}</Label>
                <select id="category" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{t(categoryKeyMap[cat])}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">{t('createGuide.difficultyLabel')}</Label>
                <select id="difficulty" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  {DIFFICULTIES.map((diff) => (<option key={diff} value={diff}>{t(difficultyKeyMap[diff])}</option>))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t('createGuide.creatingButton') : t('createGuide.createButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}