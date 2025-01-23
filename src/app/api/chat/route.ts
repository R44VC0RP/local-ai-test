import { streamText, smoothStream } from 'ai';
import { xai } from '@ai-sdk/xai';
import { NextResponse } from 'next/server';
import { Message } from '@/utils/useLocalChat';

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
  try {
    const { messages, chatId } = await req.json();
    const conversationHistory = formatMessages(messages);
    
    // Create the streaming response using xAI with smooth streaming
    const result = await streamText({
      model: xai('grok-2'),
      prompt: conversationHistory,
      system: "You are a helpful AI assistant. Provide clear and concise responses. Format your responses using markdown for better readability. Use appropriate markdown syntax for: headers (# ## ###), lists (- or 1.), code blocks (```), emphasis (*italic* or **bold**), and links [text](url).",
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: "word"
      }),
    });

    // Return the streaming response using the built-in helper
    return result.toTextStreamResponse();

  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 