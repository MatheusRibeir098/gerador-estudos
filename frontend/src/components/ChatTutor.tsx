import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../types/content';
import { sendChatMessage } from '../api/content';
import MermaidBlock from './MermaidBlock';

const chatMarkdownComponents = {
  code({ className, children, ...props }: any) {
    if (/language-mermaid/.test(className || '')) {
      return <MermaidBlock chart={String(children).replace(/\n$/, '')} />;
    }
    return <code className={className} {...props}>{children}</code>;
  },
  pre({ children }: any) {
    const child = Array.isArray(children) ? children[0] : children;
    if (child?.type === MermaidBlock) return <>{children}</>;
    return <pre>{children}</pre>;
  },
};

interface ChatTutorProps {
  lessonId: number;
  summaryContent: string;
}

export default function ChatTutor({ lessonId }: ChatTutorProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Olá! Sou seu tutor para esta aula. Pode me perguntar qualquer coisa sobre o conteúdo.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (input.trim() === '' || loading) return;
    const userMessage = input.trim();
    setInput('');
    const currentMessages = messages;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    try {
      const reply = await sendChatMessage(lessonId, userMessage, currentMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ocorreu um erro. Tente novamente.' }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col min-h-[400px]">
      <div className="flex-1 overflow-y-auto max-h-[28rem] p-5 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div className={msg.role === 'user'
              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[75%] text-sm shadow-sm'
              : 'bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[75%] text-sm text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200'
            }>
              {msg.role === 'user' ? msg.content : (
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose prose-sm prose-slate dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-pre:my-2 prose-code:text-xs prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none" components={chatMarkdownComponents}>{msg.content}</ReactMarkdown>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-brand-400 dark:bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-brand-400 dark:bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-brand-400 dark:bg-brand-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-3 p-4 border-t border-slate-100 dark:border-slate-700">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Faça uma pergunta sobre a aula..."
          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
        />
        <button
          onClick={handleSend}
          disabled={loading || input.trim() === ''}
          className="bg-brand-500 hover:bg-brand-600 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <Send size={14} /> Enviar
        </button>
      </div>
    </div>
  );
}
