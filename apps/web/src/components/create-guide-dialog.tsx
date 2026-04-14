import { useState, type FormEvent } from 'react';
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

interface CreateGuideDialogProps {
  onCreated: () => void;
}

export function CreateGuideDialog({ onCreated }: CreateGuideDialogProps) {
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
      toast.error('Title and CTF Name are required');
      return;
    }
    setIsLoading(true);
    try {
      await api.post('/guides', form);
      toast.success('Guide created!');
      setOpen(false);
      setForm({ title: '', description: '', ctfName: '', category: 'web', difficulty: 'beginner' });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create guide');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New Guide</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Guide</DialogTitle>
          <DialogDescription>Add a new CTF guide to your collection</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="SQL Injection Walkthrough" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctfName">CTF Name</Label>
              <Input id="ctfName" value={form.ctfName} onChange={(e) => setForm({ ...form, ctfName: e.target.value })} placeholder="PicoCTF 2024" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the challenge and approach" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select id="category" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select id="difficulty" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  {DIFFICULTIES.map((diff) => (<option key={diff} value={diff}>{diff.charAt(0).toUpperCase() + diff.slice(1)}</option>))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Guide'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}