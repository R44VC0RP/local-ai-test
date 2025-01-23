'use server';

import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

export async function POST(req: Request) {
    const { prompt } = await req.json();
    const { text } = await generateText({
        model: xai('grok-2-1212'),
        prompt: prompt,
    });

    return new Response(text, { status: 200 });
}