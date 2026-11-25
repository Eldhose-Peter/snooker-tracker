import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';
import {
  formatRefereeSystemPrompt,
  type RefereeMatchContext,
} from '@/lib/referee-context';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RefereeRequestBody {
  messages?: IncomingMessage[];
  context?: RefereeMatchContext | null;
}

const DEFAULT_MODEL = 'gemini-4-hydrogen';
const MAX_HISTORY_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 2500;

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          'Gemini API key is not configured. Add GEMINI_API_KEY to your .env.local or .env file and restart the server.',
      },
      { status: 503 }
    );
  }

  let body: RefereeRequestBody;
  try {
    body = (await request.json()) as RefereeRequestBody;
  } catch {
    return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const sanitized = rawMessages
    .filter(
      (m): m is IncomingMessage =>
        Boolean(m) &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_MESSAGE_CHARS),
    }));

  if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== 'user') {
    return Response.json(
      { error: 'Please enter a question for the AI Referee.' },
      { status: 400 }
    );
  }

  const contents: Content[] = sanitized.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const systemInstruction = formatRefereeSystemPrompt(body.context);

  try {
    const ai = new GoogleGenAI({ apiKey });
    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.MEDIUM,
          includeThoughts: false,
        },
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-transform',
        'X-Referee-Model': model,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unable to reach Gemini API.';
    const status =
      typeof (err as { status?: unknown })?.status === 'number'
        ? ((err as { status: number }).status)
        : 502;

    return Response.json(
      {
        error: `Gemini Referee request failed: ${message}`,
      },
      { status: status >= 400 && status < 600 ? status : 502 }
    );
  }
}
