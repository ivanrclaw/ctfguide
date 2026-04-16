import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Phase {
  id: string;
  title: string;
  content: string;
  order: number;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  ctfName: string;
  category: string;
  difficulty: string;
  published: boolean;
  slug: string | null;
  authorId: string;
  phases: Phase[];
}

interface ExportGuideProps {
  guide: Guide;
}

function assembleMarkdown(guide: Guide): string {
  const lines: string[] = [];

  lines.push(`# ${guide.title}`);
  lines.push('');

  if (guide.ctfName) {
    lines.push(`**CTF:** ${guide.ctfName}`);
  }
  if (guide.category) {
    lines.push(`**Category:** ${guide.category}`);
  }
  if (guide.difficulty) {
    lines.push(`**Difficulty:** ${guide.difficulty}`);
  }
  if (guide.description) {
    lines.push('');
    lines.push(`> ${guide.description}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  const sortedPhases = [...guide.phases].sort((a, b) => a.order - b.order);
  sortedPhases.forEach((phase, index) => {
    lines.push(`## Phase ${index + 1}: ${phase.title}`);
    lines.push('');
    if (phase.content) {
      lines.push(phase.content);
    } else {
      lines.push('*No content yet.*');
    }
    lines.push('');
    if (index < sortedPhases.length - 1) {
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function ExportGuide({ guide }: ExportGuideProps) {
  const { t } = useTranslation('common');
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportMarkdown = useCallback(() => {
    const md = assembleMarkdown(guide);
    const safeName = guide.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    downloadFile(md, `${safeName}.md`, 'text/markdown;charset=utf-8');
    toast.success(t('editor.exportMarkdownSuccess'));
  }, [guide, t]);

  const handleExportPdf = useCallback(async () => {
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('ctfguide_token');
      const res = await fetch(`/api/guides/${guide.id}/export/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${guide.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('editor.exportPdfSuccess'));
    } catch (err) {
      console.error('PDF export failed:', err);
      toast.error(t('editor.exportPdfError'));
    } finally {
      setExportingPdf(false);
    }
  }, [guide, t]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exportingPdf}>
          {exportingPdf ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1 h-4 w-4" />
          )}
          {t('editor.export')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportMarkdown}>
          <FileText className="mr-2 h-4 w-4" />
          {t('editor.exportMarkdown')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportPdf} disabled={exportingPdf}>
          <FileDown className="mr-2 h-4 w-4" />
          {exportingPdf ? t('editor.exporting') : t('editor.exportPdf')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
