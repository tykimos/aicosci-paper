/**
 * Skill Executor: Executes skills by calling Azure OpenAI API
 */

import { AzureOpenAI } from 'openai';
import type {
  ExecutionResult,
  ExecutionSignals,
  ConversationMessage,
} from './types';
import { SKILL_PROMPTS, EXECUTION_BASE_PROMPT } from './prompts';

// Get Azure OpenAI configuration at runtime
function getAzureConfig() {
  return {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.2-chat',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview',
  };
}

// Initialize Azure OpenAI client
function getAzureClient(): AzureOpenAI | null {
  const config = getAzureConfig();

  if (!config.endpoint || !config.apiKey) {
    console.error('[Executor] Azure OpenAI not configured - missing endpoint or API key');
    return null;
  }

  return new AzureOpenAI({
    endpoint: config.endpoint,
    apiKey: config.apiKey,
    apiVersion: config.apiVersion,
  });
}

/**
 * Parse signals from LLM response
 */
function parseSignals(response: string): ExecutionSignals {
  const defaultSignals: ExecutionSignals = {
    coverage: 'enough',
    confidence: 'medium',
    next_action_hint: 'stop',
  };

  const signalsMatch = response.match(/<signals>([\s\S]*?)<\/signals>/);
  if (!signalsMatch) {
    return defaultSignals;
  }

  try {
    const parsed = JSON.parse(signalsMatch[1].trim());
    return { ...defaultSignals, ...parsed };
  } catch (e) {
    console.error('[Executor] Failed to parse signals:', e);
    return defaultSignals;
  }
}

/**
 * Parse prompt buttons from LLM response
 */
function parsePromptButtons(response: string): string[] | undefined {
  const buttonsMatch = response.match(/<prompt_buttons>([\s\S]*?)<\/prompt_buttons>/);
  if (!buttonsMatch) {
    return undefined;
  }

  try {
    return JSON.parse(buttonsMatch[1].trim());
  } catch (e) {
    console.error('[Executor] Failed to parse prompt_buttons:', e);
    return undefined;
  }
}

/**
 * Clean response content by removing tags
 */
function cleanContent(response: string): string {
  return response
    .replace(/<signals>[\s\S]*?<\/signals>/g, '')
    .replace(/<prompt_buttons>[\s\S]*?<\/prompt_buttons>/g, '')
    .replace(/<action_buttons>[\s\S]*?<\/action_buttons>/g, '')
    .replace(/<suggestion_buttons>[\s\S]*?<\/suggestion_buttons>/g, '')
    .trim();
}

/**
 * Build messages array for Azure OpenAI
 */
function buildMessages(
  skillId: string,
  contextPack: string,
  userMessage: string | undefined,
  history?: ConversationMessage[]
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const skillPrompt = SKILL_PROMPTS[skillId] || '';
  const systemPrompt = `${EXECUTION_BASE_PROMPT}\n\n${skillPrompt}`;

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history
  if (history && history.length > 0) {
    const recentHistory = history.slice(-8); // Last 8 messages
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  // Add current user input with context
  const userInput = `[CONTEXT_PACK]
${contextPack}
[/CONTEXT_PACK]

사용자 메시지: ${userMessage || '(이벤트 트리거)'}`;

  messages.push({ role: 'user', content: userInput });

  return messages;
}

/**
 * Execute a skill using Azure OpenAI
 */
export async function executeSkill(
  skillId: string,
  contextPack: string,
  userMessage?: string,
  history?: ConversationMessage[]
): Promise<ExecutionResult> {
  const client = getAzureClient();

  if (!client) {
    return {
      content: '죄송합니다. AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
      rawResponse: '',
      signals: {
        coverage: 'none',
        confidence: 'low',
        next_action_hint: 'stop',
      },
    };
  }

  try {
    const messages = buildMessages(skillId, contextPack, userMessage, history);

    const response = await client.chat.completions.create({
      model: getAzureConfig().deployment,
      messages,
            max_completion_tokens: 2000,
    });

    const rawResponse = response.choices[0]?.message?.content || '';
    const signals = parseSignals(rawResponse);
    const promptButtons = parsePromptButtons(rawResponse);
    const content = cleanContent(rawResponse);

    return {
      content,
      rawResponse,
      signals,
      promptButtons,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string };
    console.error('[Executor] Error executing skill:', err);

    return {
      content: '죄송합니다. 응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.',
      rawResponse: '',
      signals: {
        coverage: 'none',
        confidence: 'low',
        next_action_hint: 'stop',
      },
    };
  }
}

/**
 * Execute a skill with streaming support
 */
export async function executeSkillStream(
  skillId: string,
  contextPack: string,
  userMessage?: string,
  history?: ConversationMessage[]
): Promise<ReadableStream<Uint8Array>> {
  const client = getAzureClient();
  const encoder = new TextEncoder();

  if (!client) {
    return new ReadableStream({
      start(controller) {
        const errorData = JSON.stringify({
          type: 'error',
          data: { message: 'AI 서비스에 연결할 수 없습니다.' },
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      },
    });
  }

  const messages = buildMessages(skillId, contextPack, userMessage, history);

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create({
          model: getAzureConfig().deployment,
          messages,
                    max_completion_tokens: 2000,
          stream: true,
        });

        let fullContent = '';

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullContent += content;

            const data = JSON.stringify({
              type: 'content',
              data: content,
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Parse signals and buttons from full response
        const signals = parseSignals(fullContent);
        const promptButtons = parsePromptButtons(fullContent);
        const cleanedContent = cleanContent(fullContent);

        // Send signals
        const signalsData = JSON.stringify({
          type: 'signals',
          data: signals,
        });
        controller.enqueue(encoder.encode(`data: ${signalsData}\n\n`));

        // Send buttons if present
        if (promptButtons) {
          const buttonsData = JSON.stringify({
            type: 'buttons',
            data: promptButtons,
          });
          controller.enqueue(encoder.encode(`data: ${buttonsData}\n\n`));
        }

        // Send done signal
        const doneData = JSON.stringify({
          type: 'done',
          data: {
            content: cleanedContent,
            signals,
            promptButtons,
          },
        });
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));

        controller.close();
      } catch (error) {
        console.error('[Executor] Stream error:', error);

        const errorData = JSON.stringify({
          type: 'error',
          data: { message: '응답 생성 중 오류가 발생했습니다.' },
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}
