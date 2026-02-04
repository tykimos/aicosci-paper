import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function GET() {
  const config = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    hasApiKey: !!process.env.AZURE_OPENAI_API_KEY,
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  };

  console.log('[Test] Azure config:', config);

  if (!config.endpoint || !config.hasApiKey) {
    return NextResponse.json({
      success: false,
      error: 'Missing Azure OpenAI configuration',
      config,
    });
  }

  try {
    const client = new AzureOpenAI({
      endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
      apiKey: process.env.AZURE_OPENAI_API_KEY!,
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview',
    });

    const response = await client.chat.completions.create({
      model: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-5.2-chat',
      messages: [{ role: 'user', content: '안녕' }],
      max_completion_tokens: 50,
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content,
      config,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; code?: string };
    return NextResponse.json({
      success: false,
      error: err.message,
      status: err.status,
      code: err.code,
      config,
    });
  }
}
