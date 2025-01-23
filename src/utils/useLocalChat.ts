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

interface SyncOperation {
  id: string;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  attempts: number;
  lastAttempt: Date;
}

class ChatDB extends Dexie {
    chats!: Table<Chat, string>;
    messages!: Table<Message, string>;
    syncQueue!: Table<SyncOperation, string>;

    constructor() {
        super('ChatDB');
        this.version(1).stores({
            chats: 'id, createdAt, updatedAt',
            messages: 'id, role, content, chatId, createdAt',
            syncQueue: 'id, action, attempts, lastAttempt'
        });
    }
}

const db = new ChatDB();

/**
 * Sync changes to the server
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncToServer(action: string, data: any = {}) {
  console.log(`🔄 Syncing ${action}...`, data);
  try {
    // For addMessage, first ensure the chat exists
    if (action === 'addMessage') {
      // Check if chat exists
      const chatResponse = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'getChat',
          chatId: data.chatId
        }),
      });

      // If chat doesn't exist, create it first
      if (chatResponse.status === 404) {
        console.log(`⚠️ Chat ${data.chatId} not found on server, creating it first...`);
        const chat = await db.chats.get(data.chatId);
        if (!chat) {
          throw new Error('Chat not found in local database');
        }

        // Get the first message for this chat to use as initial message
        const firstMessage = await db.messages
          .where({ chatId: data.chatId })
          .sortBy('createdAt')
          .then(messages => messages[0]);

        if (!firstMessage) {
          throw new Error('No messages found for chat');
        }

        // Create the chat with its first message
        const createChatResponse = await fetch('/api/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'addChat',
            chatId: data.chatId,
            role: firstMessage.role,
            content: firstMessage.content
          }),
        });

        if (!createChatResponse.ok) {
          throw new Error('Failed to create chat on server');
        }
        console.log(`✅ Created chat ${data.chatId} on server`);
      }
    }

    // Proceed with the original action
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...data
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    console.log(`✅ Successfully synced ${action}`);
  } catch (error) {
    console.error(`❌ Error syncing ${action}:`, error);
    // Store failed sync operation for retry
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      action,
      data,
      attempts: 0,
      lastAttempt: new Date()
    };
    await db.syncQueue.add(syncOp);
    console.log(`📥 Added ${action} to sync queue for retry`);
  }
}

/**
 * Retry failed sync operations
 */
async function retryFailedSyncs() {
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY = 1000 * 60; // 1 minute

  const now = new Date();
  const failedSyncs = await db.syncQueue
    .where('attempts')
    .below(MAX_ATTEMPTS)
    .and(op => {
      const timeSinceLastAttempt = now.getTime() - op.lastAttempt.getTime();
      return timeSinceLastAttempt > RETRY_DELAY;
    })
    .toArray();

  if (failedSyncs.length > 0) {
    console.log(`🔁 Retrying ${failedSyncs.length} failed sync(s)...`);
  }

  for (const op of failedSyncs) {
    console.log(`🔄 Retrying ${op.action} (attempt ${op.attempts + 1}/${MAX_ATTEMPTS})...`);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: op.action,
          ...op.data
        }),
      });

      if (response.ok) {
        // Success - remove from queue
        await db.syncQueue.delete(op.id);
        console.log(`✅ Successfully synced ${op.action} on retry`);
      } else {
        // Failed - increment attempts
        await db.syncQueue.update(op.id, {
          attempts: op.attempts + 1,
          lastAttempt: now
        });
        console.log(`⚠️ Failed to sync ${op.action} on retry (attempt ${op.attempts + 1}/${MAX_ATTEMPTS})`);
      }
    } catch (error) {
      console.error(`❌ Error retrying sync for ${op.action}:`, error);
      await db.syncQueue.update(op.id, {
        attempts: op.attempts + 1,
        lastAttempt: now
      });
    }
  }
}

// Set up periodic retry of failed syncs
if (typeof window !== 'undefined') {
  console.log('🔄 Setting up periodic sync retry...');
  setInterval(retryFailedSyncs, 1000 * 60); // Check every minute
  console.log('✅ Sync retry system initialized');
}

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

    // Sync to server in background
    syncToServer('addChat', { role, content, chatId });

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

    // Sync to server in background
    syncToServer('addMessage', { chatId, role, content });

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

  // Sync deletion to server in background
  syncToServer('deleteChat', { chatId });
} 