import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { action, role, content, chatId } = await req.json();

    switch (action) {
      /**
       * addChat:
       * Creates a new chat along with a single initial message.
       * Mirrors the "addChat" functionality from the local version.
       */
      case 'addChat': {
        const chat = await prisma.chat.create({
          data: {
            id: chatId,
            messages: {
              create: {
                role,
                content
              }
            }
          }
        });
        if (chat) {
          return new Response('Chat created', { status: 200 });
        }
        return new Response('Failed to create chat', { status: 400 });
      }

      /**
       * getChats:
       * Returns all existing chats.
       */
      case 'getChats': {
        const chats = await prisma.chat.findMany();
        return new Response(JSON.stringify(chats), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      /**
       * getChat:
       * Returns a single chat by ID (if found).
       */
      case 'getChat': {
        if (!chatId) {
          return new Response('chatId required', { status: 400 });
        }
        const chat = await prisma.chat.findUnique({
          where: { id: chatId }
        });
        if (!chat) {
          return new Response('Chat not found', { status: 404 });
        }
        return new Response(JSON.stringify(chat), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      /**
       * getMessagesByChatId:
       * Returns all messages associated with a given chat, sorted by createdAt.
       */
      case 'getMessagesByChatId': {
        if (!chatId) {
          return new Response('chatId required', { status: 400 });
        }
        const messages = await prisma.message.findMany({
          where: { chatId },
          orderBy: { createdAt: 'asc' }
        });
        return new Response(JSON.stringify(messages), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      /**
       * addMessage:
       * Adds a new message to an existing chat, updating the chat's updatedAt timestamp.
       */
      case 'addMessage': {
        if (!chatId) {
          return new Response('chatId required', { status: 400 });
        }
        await prisma.chat.update({
          where: { id: chatId },
          data: {
            updatedAt: new Date(), // ensures updatedAt is refreshed
            messages: {
              create: {
                role,
                content
              }
            }
          }
        });
        return new Response('Message added', { status: 200 });
      }

      /**
       * deleteChat:
       * Deletes a chat and all its associated messages.
       */
      case 'deleteChat': {
        if (!chatId) {
          return new Response('chatId required', { status: 400 });
        }
        await prisma.chat.delete({
          where: { id: chatId }
        });
        return new Response('Chat deleted', { status: 200 });
      }

      default:
        return new Response('Action not found', { status: 400 });
    }
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}