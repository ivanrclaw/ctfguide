import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { GuideCard } from '@/components/guide-card';
import { CreateGuideDialog } from '@/components/create-guide-dialog';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface Guide {
  id: string;
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty: string;
  authorId: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export function Dashboard() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGuides = useCallback(async () => {
    try {
      const data = await api.get<Guide[]>('/guides');
      setGuides(data);
    } catch {
      toast.error('Failed to load guides');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this guide?')) return;
    try {
      await api.delete(`/guides/${id}`);
      toast.success('Guide deleted');
      setGuides((prev) => prev.filter((g) => g.id !== id));
    } catch {
      toast.error('Failed to delete guide');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Guides</h1>
          <p className="text-muted-foreground">Manage your CTF walkthrough guides</p>
        </div>
        <CreateGuideDialog onCreated={fetchGuides} />
      </div>

      {guides.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No guides yet</h2>
          <p className="mb-6 text-muted-foreground">Create your first CTF guide and start sharing your knowledge</p>
          <CreateGuideDialog onCreated={fetchGuides} />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}