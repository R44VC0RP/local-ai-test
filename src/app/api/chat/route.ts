import { streamText, smoothStream } from 'ai';
import { xai } from '@ai-sdk/xai';
import { NextResponse } from 'next/server';
import { Message } from '@/utils/useLocalChat';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize the Redis client
const redis = Redis.fromEnv();

// Create a new rate limiter with adjusted settings - increased window size but lower request count
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(5, '30 s'), // Reduced to 5 requests per 30 seconds
  analytics: false, // Disable analytics to reduce overhead
  prefix: '@upstash/ratelimit',
});

// This helper function formats messages for the AI
function formatMessages(messages: Message[]) {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content
  })).reduce((acc, msg) => {
    return acc + `${msg.role}: ${msg.content}\n`;
  }, '');
}

export async function POST(req: Request) {
    const startTime = performance.now();
    try {
      // Skip detailed logging in production
      if (process.env.NODE_ENV === 'production') {
        console.log('Request started');
      }

      // Use a more efficient way to get client IP
      const clientIdentifier = req.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';

      // Perform rate limiting only if not in development
      if (process.env.NODE_ENV === 'production') {
        const { success } = await ratelimit.limit(clientIdentifier);
        if (!success) {
          return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again later.' }, 
            { status: 429 }
          );
        }
      }

      const { messages, chatId } = await req.json();
      const conversationHistory = formatMessages(messages);

      // Benchmark AI streaming setup
      const aiStart = performance.now();
      const result = await streamText({
        model: xai('grok-2'),
        prompt: conversationHistory,
        system: "You are a helpful AI assistant. Provide clear and concise responses. Format your responses using markdown for better readability. Use appropriate markdown syntax for: headers (# ## ###), lists (- or 1.), code blocks (```), emphasis (*italic* or **bold**), and links [text](url).",
        experimental_transform: smoothStream({
          delayInMs: 20,
          chunking: 'word',
        }),
      });
      const aiTime = performance.now() - aiStart;
      console.log(`🤖 AI stream setup took: ${aiTime.toFixed(2)}ms`);

      const totalTime = performance.now() - startTime;
      console.log(`✨ Total processing time: ${totalTime.toFixed(2)}ms`);

      return result.toTextStreamResponse();

    } catch (error) {
      const errorTime = performance.now() - startTime;
      console.error(`❌ Error after ${errorTime.toFixed(2)}ms:`, error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
  }