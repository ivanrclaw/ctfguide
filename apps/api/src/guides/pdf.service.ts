import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as chromium from '@sparticuz/chromium';

@Injectable()
export class PdfService {
  async generateGuidePdf(guide: any): Promise<Buffer> {
    const sortedPhases = [...(guide.phases || [])].sort((a, b) => a.order - b.order);

    const phasesHtml = sortedPhases.map((phase, i) => `
      <section class="phase">
        <h2>Phase ${i + 1}: ${this.escapeHtml(phase.title)}</h2>
        ${phase.content ? `<div class="content">${this.escapeHtml(phase.content)}</div>` : '<p><em>No content yet.</em></p>'}
        ${i < sortedPhases.length - 1 ? '<hr>' : ''}
      </section>
    `).join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${this.escapeHtml(guide.title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.65;
      padding: 40px 50px;
      max-width: 794px;
      margin: 0 auto;
      background: #ffffff;
    }
    @page { margin: 20mm; size: A4; }
    .meta { margin-bottom: 24px; }
    .meta-row { margin: 4px 0; color: #555; font-size: 12px; }
    .meta-row strong { color: #1a1a1a; }
    h1 { font-size: 26px; font-weight: 800; margin: 0 0 20px; }
    h2 { font-size: 18px; font-weight: 700; margin: 28px 0 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
    p { margin: 8px 0; }
    blockquote { border-left: 4px solid #d0d0d0; margin: 12px 0; padding: 6px 14px; color: #555; font-style: italic; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 24px 0; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 14px 0; font-size: 12px; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
    pre code { background: none; padding: 0; }
    a { color: #2563eb; }
    .phase { page-break-inside: avoid; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(guide.title)}</h1>
  <div class="meta">
    ${guide.ctfName ? `<div class="meta-row"><strong>CTF:</strong> ${this.escapeHtml(guide.ctfName)}</div>` : ''}
    ${guide.category ? `<div class="meta-row"><strong>Category:</strong> ${this.escapeHtml(guide.category)}</div>` : ''}
    ${guide.difficulty ? `<div class="meta-row"><strong>Difficulty:</strong> ${this.escapeHtml(guide.difficulty)}</div>` : ''}
    ${guide.description ? `<blockquote>${this.escapeHtml(guide.description)}</blockquote>` : ''}
  </div>
  <hr>
  ${phasesHtml}
</body>
</html>`;

    // @ts-ignore - @sparticuz/chromium types are incomplete
    const chromiumModule: any = chromium;

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: await chromiumModule.executablePath(),
      args: chromiumModule.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.evaluateHandle('document.fonts.ready');

      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      });

      return Buffer.from(buffer);
    } finally {
      await browser.close();
    }
  }

  private escapeHtml(text: string): string {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
