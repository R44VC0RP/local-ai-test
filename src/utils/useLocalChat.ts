'use client';

import Dexie, { Table } from 'dexie';

export interface Chat {
    id?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id?: string;
    role: string;
    content: string;
    chatId: string;
    createdAt: Date;
}

class ChatDB extends Dexie {
    chats!: Table<Chat, string>;
    messages!: Table<Message, string>;

    constructor() {
        super('ChatDB');
        this.version(1).stores({
            chats: 'id, createdAt, updatedAt',
            messages: 'id, role, content, chatId, createdAt',
        });
    }
}

const db = new ChatDB();

/**
 * Create a new chat with a single message.
 * Mirrors the Prisma 'add' action from the route.ts.
 */
export async function addChat(role: string, content: string) {
    const chatId = crypto.randomUUID();
    const now = new Date();

    await db.chats.add({
        id: chatId,
        createdAt: now,
        updatedAt: now
    });

    const messageId = crypto.randomUUID();
    await db.messages.add({
        id: messageId,
        role,
        content,
        chatId,
        createdAt: now
    });

    return { chatId, messageId };
}

/**
 * Get all chats (no filtering).
 * Mirrors a Prisma 'get all' approach.
 */
export async function getChats(): Promise<Chat[]> {
    console.log('📝 Getting Chats');
    
    return await db.chats.toArray();
}

/**
 * Get a specific chat by ID.
 */
export async function getChat(chatId: string): Promise<Chat | undefined> {
    return await db.chats.get(chatId);
}

/**
 * Get all messages for a specific chat.
 */
export async function getMessagesByChatId(chatId: string): Promise<Message[]> {
    return await db.messages.where({ chatId }).sortBy('createdAt');
}

/**
 * Add a message to an existing chat.
 */
export async function addMessage(chatId: string, role: string, content: string) {
    const now = new Date();
    const messageId = crypto.randomUUID();

    // Update the chat's updatedAt field to mimic Prisma's @updatedAt behavior
    await db.chats.update(chatId, { updatedAt: now });

    await db.messages.add({
        id: messageId,
        chatId,
        role,
        content,
        createdAt: now
    });

    return { messageId };
}

/**
 * Delete a chat and all its messages
 */
export async function deleteChat(chatId: string) {
  // Delete all messages for this chat
  await db.messages.where({ chatId }).delete();
  // Delete the chat itself
  await db.chats.delete(chatId);
} 