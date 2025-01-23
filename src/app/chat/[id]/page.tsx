'use client';

import { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Message, getMessagesByChatId, addMessage, getChat } from '@/utils/useLocalChat';
import { FaPaperPlane, FaRobot, FaUser } from 'react-icons/fa';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const models = [
  { id: 'gpt-4', name: 'GPT-4', disabled: true },
  { id: 'claude-3', name: 'Claude 3.5 Sonnet', disabled: true },
  { id: 'grok-2', name: 'Grok-2', disabled: false },
] as const;

// Custom styles for markdown content
const markdownStyles = {
  p: "mb-4 last:mb-0",
  h1: "text-2xl font-bold mb-4",
  h2: "text-xl font-bold mb-3",
  h3: "text-lg font-bold mb-2",
  h4: "font-bold mb-2",
  ul: "list-disc list-inside mb-4",
  ol: "list-decimal list-inside mb-4",
  li: "mb-1",
  code: "bg-muted px-1.5 py-0.5 rounded font-mono text-sm tracking-tight",
  pre: "bg-muted p-4 rounded-lg mb-4 overflow-x-auto font-mono text-sm tracking-tight",
  a: "text-primary underline hover:no-underline",
  blockquote: "border-l-4 border-muted pl-4 italic mb-4",
  table: "min-w-full border-collapse mb-4",
  th: "border border-border px-4 py-2 bg-muted",
  td: "border border-border px-4 py-2",
  img: "max-w-full h-auto rounded-lg mb-4",
};

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('grok-2');
  const [streamingContent, setStreamingContent] = useState('');
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  useEffect(() => {
    if (!mounted) return;

    const loadChat = async () => {
      if (id && typeof id === 'string') {
        const chat = await getChat(id);
        if (!chat) {
          router.push('/chat/new');
          return;
        }
        const chatMessages = await getMessagesByChatId(id);
        setMessages(chatMessages);
      }
    };
    loadChat();
  }, [id, router, mounted]);

  // Return a loading state while client-side hydration is happening
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id || typeof id !== 'string') return;

    setIsLoading(true);
    try {
      // First save the user message
      const userMessage = await addMessage(id, 'user', newMessage);
      const updatedMessages = await getMessagesByChatId(id);
      setMessages(updatedMessages);
      setNewMessage('');

      // Start streaming AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedMessages,
          chatId: id,
        }),
      });

      if (!response.ok) throw new Error('Failed to get AI response');
      
      // Handle streaming response
      setStreamingContent(''); // Reset streaming content
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let fullResponse = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = new TextDecoder().decode(value);
          fullResponse += text;
          setStreamingContent(fullResponse);
        }
      } finally {
        reader.releaseLock();
      }

      // After streaming is complete, save the AI response
      await addMessage(id, 'assistant', fullResponse);
      const finalMessages = await getMessagesByChatId(id);
      setMessages(finalMessages);
      setStreamingContent('');

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-3xl mx-auto py-6 space-y-6">
          {messages.filter(message => message.content !== "NEWMESSAGE").map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted'
              }`}>
                {message.role === 'user' 
                  ? <FaUser className="w-4 h-4" />
                  : <FaRobot className="w-4 h-4" />
                }
              </div>
              <Card className={`max-w-[80%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : ''
              }`}>
                {message.role === 'user' ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({children}) => <p className={markdownStyles.p}>{children}</p>,
                        h1: ({children}) => <h1 className={markdownStyles.h1}>{children}</h1>,
                        h2: ({children}) => <h2 className={markdownStyles.h2}>{children}</h2>,
                        h3: ({children}) => <h3 className={markdownStyles.h3}>{children}</h3>,
                        h4: ({children}) => <h4 className={markdownStyles.h4}>{children}</h4>,
                        ul: ({children}) => <ul className={markdownStyles.ul}>{children}</ul>,
                        ol: ({children}) => <ol className={markdownStyles.ol}>{children}</ol>,
                        li: ({children}) => <li className={markdownStyles.li}>{children}</li>,
                        code: ({children}) => <code className={markdownStyles.code}>{children}</code>,
                        pre: ({children}) => <pre className={markdownStyles.pre}>{children}</pre>,
                        a: ({href, children}) => <a href={href} className={markdownStyles.a} target="_blank" rel="noopener noreferrer">{children}</a>,
                        blockquote: ({children}) => <blockquote className={markdownStyles.blockquote}>{children}</blockquote>,
                        table: ({children}) => <table className={markdownStyles.table}>{children}</table>,
                        th: ({children}) => <th className={markdownStyles.th}>{children}</th>,
                        td: ({children}) => <td className={markdownStyles.td}>{children}</td>,
                        img: ({src, alt}) => <img src={src} alt={alt} className={markdownStyles.img} />,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
                <time className="text-xs text-muted-foreground mt-2 block">
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit'
                  })}
                </time>
              </Card>
            </div>
          ))}
          {streamingContent && (
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <FaRobot className="w-4 h-4" />
              </div>
              <Card className="max-w-[80%] p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: ({children}) => <p className={markdownStyles.p}>{children}</p>,
                      h1: ({children}) => <h1 className={markdownStyles.h1}>{children}</h1>,
                      h2: ({children}) => <h2 className={markdownStyles.h2}>{children}</h2>,
                      h3: ({children}) => <h3 className={markdownStyles.h3}>{children}</h3>,
                      h4: ({children}) => <h4 className={markdownStyles.h4}>{children}</h4>,
                      ul: ({children}) => <ul className={markdownStyles.ul}>{children}</ul>,
                      ol: ({children}) => <ol className={markdownStyles.ol}>{children}</ol>,
                      li: ({children}) => <li className={markdownStyles.li}>{children}</li>,
                      code: ({children}) => <code className={markdownStyles.code}>{children}</code>,
                      pre: ({children}) => <pre className={markdownStyles.pre}>{children}</pre>,
                      a: ({href, children}) => <a href={href} className={markdownStyles.a} target="_blank" rel="noopener noreferrer">{children}</a>,
                      blockquote: ({children}) => <blockquote className={markdownStyles.blockquote}>{children}</blockquote>,
                      table: ({children}) => <table className={markdownStyles.table}>{children}</table>,
                      th: ({children}) => <th className={markdownStyles.th}>{children}</th>,
                      td: ({children}) => <td className={markdownStyles.td}>{children}</td>,
                      img: ({src, alt}) => <img src={src} alt={alt} className={markdownStyles.img} />,
                    }}
                  >
                    {streamingContent}
                  </ReactMarkdown>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex gap-2">
          <Select
            value={selectedModel}
            onValueChange={setSelectedModel}
          >
            <SelectTrigger className="w-[180px] shrink-0">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem
                  key={model.id}
                  value={model.id}
                  disabled={model.disabled}
                >
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              className="min-h-[44px] max-h-[200px] resize-none"
              rows={1}
            />
            <Button type="submit" disabled={isLoading} className="shrink-0">
              <FaPaperPlane className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 