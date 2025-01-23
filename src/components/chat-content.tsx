type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
};

// Dummy messages
const messages: Message[] = [
  { id: "1", role: "assistant", content: "Hello! How can I help you today?", timestamp: "2:30 PM" },
  { id: "2", role: "user", content: "I'd like to learn about artificial intelligence.", timestamp: "2:31 PM" },
  { id: "3", role: "assistant", content: "That's great! AI is a fascinating field. Would you like to start with the basics?", timestamp: "2:31 PM" },
];

export function ChatContent() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Message input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 