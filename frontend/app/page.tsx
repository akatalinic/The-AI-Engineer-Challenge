'use client';

import { useState, useRef, useEffect } from 'react';
import MatrixRain from '@/components/MatrixRain';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
}

const API_KEY_STORAGE_KEY = 'openai_api_key';

export default function Home() {
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'System initialized. Matrix terminal ready. Type your message below...',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const outputRef = useRef<HTMLDivElement>(null);

  // Check for stored API key on mount
  useEffect(() => {
    const storedKey = sessionStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) {
      setApiKey(storedKey);
      setShowApiKeyModal(false);
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages]);

  const handleApiKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApiKeyError('');

    const key = apiKeyInput.trim();
    
    if (!key) {
      setApiKeyError('API key is required');
      return;
    }

    // Basic validation - OpenAI keys typically start with 'sk-'
    if (!key.startsWith('sk-')) {
      setApiKeyError('Invalid API key format. OpenAI keys typically start with "sk-"');
      return;
    }

    // Store in sessionStorage (cleared when browser closes)
    sessionStorage.setItem(API_KEY_STORAGE_KEY, key);
    setApiKey(key);
    setShowApiKeyModal(false);
    setApiKeyInput('');
  };

  const handleClearApiKey = () => {
    sessionStorage.removeItem(API_KEY_STORAGE_KEY);
    setApiKey('');
    setShowApiKeyModal(true);
    setMessages([
      {
        role: 'assistant',
        content: 'System initialized. Matrix terminal ready. Type your message below...',
      },
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'error',
            content: '[ERROR] API key is required. Please enter your OpenAI API key.',
          },
        ]);
        setShowApiKeyModal(true);
        return;
      }

      // Use /api/chat endpoint - Next.js will proxy to FastAPI backend in dev,
      // or Vercel will route to FastAPI backend in production
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenAI-API-Key': apiKey, // Send API key in custom header
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
      {showApiKeyModal && (
        <div className="api-key-modal">
          <div className="api-key-modal-content">
            <div className="api-key-modal-title">
              {'>'} API KEY REQUIRED
            </div>
            <div className="api-key-modal-description">
              Enter your OpenAI API key to access the chat interface. Your key is stored locally in your browser session and is never sent to our servers except for API requests.
            </div>
            <form onSubmit={handleApiKeySubmit}>
              <div className="api-key-input-container">
                <label htmlFor="api-key-input" className="api-key-input-label">
                  OpenAI API Key
                </label>
                <input
                  id="api-key-input"
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setApiKeyError('');
                  }}
                  className="api-key-input"
                  placeholder="sk-..."
                  autoFocus
                />
                {apiKeyError && (
                  <div className="api-key-error">{apiKeyError}</div>
                )}
                <div className="api-key-warning">
                  ⚠️ Your API key is stored in browser session storage and will be cleared when you close the browser.
                </div>
              </div>
              <button type="submit" className="api-key-button">
                Connect
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="terminal-header">
        <div className="terminal-title">
          {'>'} MATRIX TERMINAL v1.0 | AI CHAT INTERFACE
          {apiKey && (
            <span style={{ marginLeft: '20px', fontSize: '10px', opacity: 0.7 }}>
              [API Key: {apiKey.substring(0, 7)}...] 
              <button
                onClick={handleClearApiKey}
                style={{
                  marginLeft: '10px',
                  background: 'transparent',
                  border: '1px solid #00ff00',
                  color: '#00ff00',
                  padding: '2px 8px',
                  cursor: 'pointer',
                  fontSize: '10px',
                }}
              >
                Clear
              </button>
            </span>
          )}
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

