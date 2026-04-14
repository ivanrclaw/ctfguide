import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmVerifyService {
  private readonly logger = new Logger(LlmVerifyService.name);

  async verifyAnswer(
    question: string,
    expectedAnswer: string,
    userAnswer: string,
  ): Promise<boolean> {
    try {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        this.logger.error('OPENROUTER_API_KEY is not set');
        return false;
      }

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
                  "You are a CTF challenge verifier. The challenge creator provided a question and expected answer. A user submitted an answer. Determine if the user's answer is essentially correct, even if worded differently. Return ONLY 'true' or 'false'.",
              },
              {
                role: 'user',
                content: `Question: ${question}\nExpected answer: ${expectedAnswer}\nUser's answer: ${userAnswer}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        this.logger.error(
          `OpenRouter API returned ${response.status}: ${await response.text()}`,
        );
        return false;
      }

      const data = await response.json();
      const content: string =
        data?.choices?.[0]?.message?.content?.trim().toLowerCase() ?? '';

      return content === 'true';
    } catch (error) {
      this.logger.error('LLM verification failed', error);
      return false;
    }
  }
}