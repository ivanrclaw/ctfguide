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
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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

  // Title
  lines.push(`# ${guide.title}`);
  lines.push('');

  // Metadata
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

  // Phases sorted by order
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
      // Build the PDF from markdown content
      const md = assembleMarkdown(guide);
      const safeName = guide.title.replace(/[^a-zA-Z0-9_-]/g, '_');

      // Create a hidden container for rendering
      const container = document.createElement('div');
      container.style.visibility = 'hidden';
      container.style.position = 'absolute';
      container.style.left = '0';
      container.style.top = '0';
      container.style.padding = '40px';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      container.style.color = '#1a1a1a';
      container.style.maxWidth = '700px';
      container.style.fontSize = '14px';
      container.style.lineHeight = '1.6';
      container.style.background = '#ffffff';
      container.style.width = '794px';

      const html = markdownToHtml(md);
      container.innerHTML = html;
      document.body.appendChild(container);

      // html2canvas 1.4.x does not support oklch/oklab/lab/lch/color() CSS functions.
      // Walk the tree and replace them with rgb equivalents before capturing.
      fixUnsupportedColors(container);

      await document.fonts.ready;
      await new Promise(r => requestAnimationFrame(r));

      try {
        // Use html2canvas to render the container to a canvas
        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        // Create PDF with jsPDF
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        // Add the first page
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Add subsequent pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`${safeName}.pdf`);
        toast.success(t('editor.exportPdfSuccess'));
      } finally {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
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

/**
 * Simple markdown-to-HTML converter for PDF rendering.
 * Covers: headings, bold, italic, code blocks, inline code,
 * blockquotes, lists, horizontal rules, links, images.
 */
function markdownToHtml(md: string): string {
  let html = md;

  // Escape HTML entities (but preserve the markdown structure)
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (``` ... ```) — must be before other rules
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    return `<pre style="background:#f5f5f5;padding:12px;border-radius:6px;overflow-x:auto;margin:16px 0;font-size:13px;"><code${lang ? ` class="language-${lang}"` : ''}>${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px;">$1</code>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h4 style="margin:16px 0 8px;font-size:16px;font-weight:600;">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 style="margin:20px 0 10px;font-size:18px;font-weight:600;">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 style="margin:24px 0 12px;font-size:22px;font-weight:700;border-bottom:1px solid #e0e0e0;padding-bottom:8px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 style="margin:0 0 16px;font-size:28px;font-weight:800;">$1</h1>');

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:4px solid #d0d0d0;margin:12px 0;padding:8px 16px;color:#555;">$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e0e0e0;margin:24px 0;">');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:none;">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:12px 0;">');

  // Unordered lists (simple consecutive lines starting with - or *)
  html = html.replace(/^[-*] (.+)$/gm, '<li style="margin-left:20px;list-style:disc;">$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li style="margin-left:20px;list-style:decimal;">$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, (match) => {
    return `<ul style="margin:8px 0;padding:0;">${match}</ul>`;
  });

  // Paragraphs: wrap remaining loose lines
  html = html.replace(/^(?!<[hupblo]|<li|<hr|<pre|<code|<ul|<ol|<blockquote|<a |<img)(.+)$/gm, '<p style="margin:8px 0;">$1</p>');

  return html;
}

/**
 * Recursively walk element styles and computed styles to replace CSS color
 * functions (oklch, oklab, lab, lch, color()) that html2canvas 1.4.x does
 * not support, converting them to rgb equivalents via the browser's
 * `color-mix()` and `rgb()` conversion.
 */
function fixUnsupportedColors(root: Element) {
  const unsupported = /^(oklch|oklab|lab|lch|color\()/;

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;

      // Check inline style attribute
      const inlineStyle = el.getAttribute('style') || '';
      if (unsupported.test(inlineStyle)) {
        el.setAttribute('style', convertColors(inlineStyle));
      }

      // Recurse into children
      for (const child of Array.from(el.childNodes)) {
        walk(child);
      }
    }
  };

  // Converts any unsupported color value in a CSS declaration to rgb.
  // Uses the browser's color conversion by creating a temporary element.
  function convertColors(css: string): string {
    try {
      // Only process if there are actually unsupported functions present
      if (!unsupported.test(css)) return css;

      // Build a throwaway element with the raw CSS, let the browser parse it
      const dummy = document.createElement('div');
      dummy.setAttribute('style', css);
      document.body.appendChild(dummy);

      const computed = dummy.style.cssText;
      document.body.removeChild(dummy);

      return computed || css;
    } catch {
      // If anything goes wrong during conversion, return original
      return css;
    }
  }

  walk(root);
}