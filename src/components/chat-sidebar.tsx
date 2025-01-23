import { useEffect, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getChats, getMessagesByChatId, deleteChat } from "@/utils/useLocalChat";

type Chat = {
  id: string;
  title: string;
};

export function ChatSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);

  const loadChats = async () => {
    const loadedChats = await getChats();
    
    // Transform chats to include titles by getting the first message of each chat
    const chatsWithTitles = await Promise.all(
      loadedChats
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map(async (chat) => {
          const messages = await getMessagesByChatId(chat.id!);
          const secondMessage = messages[1];
          // Use first few words of second message as title if it exists, otherwise default to New Chat
          const title = secondMessage
            ? secondMessage.content.split(' ').slice(0, 5).join(' ') + '...'
            : 'New Chat';
          
          return {
            id: chat.id!,
            title,
          };
        })
    );
    
    setChats(chatsWithTitles);
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    try {
      await deleteChat(chatId);
      // If we're currently on this chat's page, redirect to new chat
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat/new');
      }
      // Refresh the chat list
      loadChats();
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  // Load chats initially
  useEffect(() => {
    loadChats();
  }, []);

  // Set up an interval to refresh the chat list
  useEffect(() => {
    const interval = setInterval(loadChats, 2000); // Refresh every 2 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-[280px] border-r bg-card">
      <div className="p-4">
        <Button asChild variant="secondary" className="w-full justify-start">
          <Link href="/chat/new">
            <FaPlus className="mr-2 h-4 w-4" />
            New Chat
          </Link>
        </Button>
      </div>
      
      <Separator />
      
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-2 space-y-1">
          {chats.map((chat) => {
            const isActive = pathname === `/chat/${chat.id}`;
            return (
              <div key={chat.id} className="group relative">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  asChild
                  className="w-full justify-start font-normal pr-12"
                >
                  <Link href={`/chat/${chat.id}`}>
                    <span className="truncate">{chat.title}</span>
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                >
                  <FaTrash className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
} 