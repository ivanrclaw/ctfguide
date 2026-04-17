import { Injectable, Logger } from '@nestjs/common';

export const REWRITE_TONES = [
  { id: 'mysterious', label: 'Mysterious', emoji: '🔮' },
  { id: 'formal', label: 'Formal', emoji: '🎩' },
  { id: 'realistic', label: 'Realistic', emoji: '📰' },
  { id: 'humorous', label: 'Humorous', emoji: '😄' },
  { id: 'dramatic', label: 'Dramatic', emoji: '🎭' },
  { id: 'minimalist', label: 'Minimalist', emoji: '✂️' },
  { id: 'cyberpunk', label: 'Cyberpunk', emoji: '🌆' },
  { id: 'pirate', label: 'Pirate', emoji: '🏴‍☠️' },
  { id: 'detective', label: 'Detective Noir', emoji: '🕵️' },
  { id: 'academic', label: 'Academic', emoji: '🎓' },
] as const;

export type ToneId = (typeof REWRITE_TONES)[number]['id'];

const TONE_PROMPTS: Record<ToneId, string> = {
  mysterious:
    'Rewrite the following CTF challenge content in a mysterious, enigmatic tone. Use suspenseful language, hints of secrecy, and an atmosphere of the unknown. Keep the technical accuracy intact but wrap it in intrigue. Maintain markdown formatting.',
  formal:
    'Rewrite the following CTF challenge content in a formal, professional tone. Use precise language, structured explanations, and an authoritative voice suitable for a technical document. Maintain markdown formatting.',
  realistic:
    'Rewrite the following CTF challenge content in a realistic, journalistic tone. Present it as a real-world incident report or case study. Use concrete details and a matter-of-fact approach. Maintain markdown formatting.',
  humorous:
    'Rewrite the following CTF challenge content in a humorous, lighthearted tone. Add witty remarks, playful analogies, and occasional jokes while keeping the technical information accurate and useful. Maintain markdown formatting.',
  dramatic:
    'Rewrite the following CTF challenge content in a dramatic, cinematic tone. Use vivid imagery, intense pacing, and a sense of urgency. Make it read like a thriller narrative while preserving the technical facts. Maintain markdown formatting.',
  minimalist:
    'Rewrite the following CTF challenge content in a minimalist, concise style. Strip away all fluff. Use short sentences, bullet points where possible, and only the essential information. Maintain markdown formatting.',
  cyberpunk:
    'Rewrite the following CTF challenge content in a cyberpunk style. Use neon-lit dystopian imagery, hacker slang, and a gritty tech-noir atmosphere. Reference corporatocracy, digital underground, and the mesh. Maintain markdown formatting.',
  pirate:
    'Rewrite the following CTF challenge content in a pirate-themed tone. Use nautical metaphors, pirate expressions (arr, matey, ye), and frame the challenge as a treasure hunt on the high seas. Keep the technical information accurate. Maintain markdown formatting.',
  detective:
    'Rewrite the following CTF challenge content in a detective noir style. Use first-person narration, hardboiled language, rain-soaked metaphors, and frame the challenge as a case to crack. Maintain markdown formatting and technical accuracy.',
  academic:
    'Rewrite the following CTF challenge content in an academic, scholarly tone. Use formal citations style, analytical language, and structured argumentation. Frame it as a research problem with methodology. Maintain markdown formatting.',
};

@Injectable()
export class LlmRewriteService {
  private readonly logger = new Logger(LlmRewriteService.name);

  async rewrite(content: string, tone: ToneId): Promise<string> {
    const prompt = TONE_PROMPTS[tone];
    if (!prompt) {
      throw new Error(`Unknown tone: ${tone}`);
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      this.logger.error('OPENROUTER_API_KEY is not set');
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    this.logger.log(`Rewriting content with tone: ${tone}`);

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-5.4-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are an expert CTF (Capture The Flag) challenge writer. Your task is to rewrite challenge content while preserving all technical accuracy, commands, code snippets, and key information. Never remove technical details — only change the prose around them. Always output valid markdown. Do not include any preamble or commentary — just output the rewritten content.',
            },
            {
              role: 'user',
              content: `${prompt}\n\nHere is the content to rewrite:\n\n${content}`,
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `OpenRouter API returned ${response.status}: ${body}`,
      );
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const rewritten: string =
      data?.choices?.[0]?.message?.content?.trim() ?? '';

    if (!rewritten) {
      throw new Error('Empty response from OpenRouter');
    }

    this.logger.log(`Rewrite successful: ${rewritten.length} chars`);
    return rewritten;
  }
}
