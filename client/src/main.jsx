import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: 'Invalid server response' };
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

function Login({ name, setName, onStart, error }) {
  return (
    <div className="login">
      <div className="login-box">
        <h1>NEBULA</h1>
        <form onSubmit={onStart}>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ENTER YOUR IDENTITY..."
            autoFocus
            maxLength={80}
          />
          <button type="submit">INITIALIZE</button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}

function Chat({
  name,
  messages,
  input,
  setInput,
  loading,
  onSend,
  onLogout,
  messagesEndRef,
  error
}) {
  return (
    <div className="app-shell">
      <div className="header">
        <div>
          <h1>NEBULA</h1>
          <span className="user">{name.toUpperCase()}</span>
          <span className="status-label">[ ONLINE ]</span>
        </div>
        <button className="logout" onClick={onLogout} type="button">
          LOGOUT
        </button>
      </div>

      <div className="messages">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`message ${message.role === 'user' ? 'user' : 'ai'}`}
          >
            {message.content}
          </div>
        ))}
        {loading && <div className="thinking">THINKING...</div>}
        {error && <div className="error chat-error">{error}</div>}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-area" onSubmit={onSend}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="ASK SOMETHING..."
          disabled={loading}
          maxLength={4000}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          SEND
        </button>
      </form>
    </div>
  );
}

function App() {
  const [name, setName] = useState('');
  const [started, setStarted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api('/api/session')
      .then((data) => {
        if (data.authenticated && data.name) {
          setName(data.name);
          setStarted(true);
          setMessages([
            {
              role: 'assistant',
              content: 'NEBULA REACTIVATED. Welcome back.'
            }
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function startChat(event) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) return;

    setError('');

    try {
      const data = await api('/api/session', {
        method: 'POST',
        body: JSON.stringify({ name: cleanName })
      });

      setName(data.name || cleanName);
      setStarted(true);
      setMessages([
        {
          role: 'assistant',
          content: `NEBULA ACTIVATED. Welcome, ${data.name || cleanName}.`
        }
      ]);
    } catch (requestError) {
      setError(requestError.message || 'Could not start the session.');
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    setInput('');
    setError('');
    setMessages((current) => [
      ...current,
      { role: 'user', content: prompt }
    ]);
    setLoading(true);

    try {
      const data = await api('/api/ask', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.response || 'No response returned.'
        }
      ]);
    } catch (requestError) {
      setError(requestError.message || 'AI server is unavailable.');
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api('/api/logout', { method: 'POST' });
    } finally {
      setStarted(false);
      setMessages([]);
      setName('');
      setError('');
    }
  }

  if (checking) {
    return (
      <div className="loading">
        <h2>INITIALIZING NEBULA...</h2>
      </div>
    );
  }

  if (!started) {
    return (
      <Login
        name={name}
        setName={setName}
        onStart={startChat}
        error={error}
      />
    );
  }

  return (
    <Chat
      name={name}
      messages={messages}
      input={input}
      setInput={setInput}
      loading={loading}
      onSend={sendMessage}
      onLogout={logout}
      messagesEndRef={messagesEndRef}
      error={error}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
