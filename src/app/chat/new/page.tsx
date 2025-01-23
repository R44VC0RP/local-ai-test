'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { addChat } from '@/utils/useLocalChat';

export default function NewChatPage() {
  const router = useRouter();
  const isCreatingChat = useRef(false);

  useEffect(() => {
    const createAndRedirect = async () => {
      // Prevent multiple chat creations
      if (isCreatingChat.current) return;
      isCreatingChat.current = true;

      try {
        // Create a new chat with an initial welcome message
        const { chatId } = await addChat('assistant', 'NEWMESSAGE');
        // Redirect to the new chat
        router.push(`/chat/${chatId}`);
      } catch (error) {
        console.error('Failed to create chat:', error);
        isCreatingChat.current = false;
      }
    };
    createAndRedirect();
  }, [router]);

  // Show a loading state while creating chat and redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 