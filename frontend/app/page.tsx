'use client';

import { useState, useRef, useEffect } from 'react';
import MatrixRain from '@/components/MatrixRain';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'System initialized. Matrix terminal ready. Type your message below...',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Use /api/chat endpoint - Next.js will proxy to FastAPI backend in dev,
      // or Vercel will route to FastAPI backend in production
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.reply) {
        throw new Error('Invalid response from server: missing reply field');
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply },
      ]);
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Failed to connect to server.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Provide helpful context for common errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to backend. Make sure the FastAPI server is running on http://localhost:8000';
        }
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content: `[ERROR] ${errorMessage}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="terminal-container">
      <MatrixRain />
      <div className="terminal-header">
        <div className="terminal-title">
          {'>'} MATRIX TERMINAL v1.0 | AI CHAT INTERFACE
        </div>
      </div>
      <div className="terminal-output" ref={outputRef}>
        {messages.map((message, index) => (
          <div key={index} className="message">
            {message.role === 'user' && (
              <span>
                <span className="message-prompt">{'$'}</span>
                <span className="message-user">{message.content}</span>
              </span>
            )}
            {message.role === 'assistant' && (
              <span>
                <span className="message-prompt">{'>'}</span>
                <span className="message-assistant">{message.content}</span>
              </span>
            )}
            {message.role === 'error' && (
              <span>
                <span className="message-prompt">{'[ERROR]'}</span>
                <span className="message-error">{message.content}</span>
              </span>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="message">
            <span className="message-prompt">{'>'}</span>
            <span className="message-assistant loading">Processing</span>
          </div>
        )}
      </div>
      <div className="terminal-input-area">
        <form onSubmit={handleSubmit} className="input-container">
          <span className="input-prompt">{'$'}</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="terminal-input"
            placeholder="Enter your message..."
            disabled={isLoading}
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}

