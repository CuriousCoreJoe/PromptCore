import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mt-1 ${
          isUser ? 'bg-indigo-600 ml-3' : 'bg-brand-600 mr-3'
        }`}>
          {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
        </div>

        {/* Content */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed overflow-hidden ${
            isUser 
              ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-100 rounded-tr-sm' 
              : 'bg-dark-800 border border-dark-700 text-gray-200 rounded-tl-sm'
          }`}>
            <ReactMarkdown
              components={{
                code({node, inline, className, children, ...props}: any) {
                  return !inline ? (
                    <div className="my-2 bg-dark-950 rounded-lg border border-dark-700 overflow-hidden">
                      <div className="bg-dark-900 px-3 py-1 text-xs text-gray-500 border-b border-dark-700 flex justify-between">
                         <span>Code</span>
                      </div>
                      <pre className="p-3 overflow-x-auto text-sm font-mono text-gray-300">
                        <code {...props}>{children}</code>
                      </pre>
                    </div>
                  ) : (
                    <code className="bg-dark-900 text-brand-400 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                      {children}
                    </code>
                  )
                },
                ul: ({children}) => <ul className="list-disc pl-4 my-2 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-4 my-2 space-y-1">{children}</ol>,
                p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          
          <span className="text-xs text-gray-600 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};