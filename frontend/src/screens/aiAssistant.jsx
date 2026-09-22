import { useEffect, useRef, useState } from 'react';
import api from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import {
  SparklesIcon,
  PaperAirplaneIcon,
  PhotoIcon,
  CameraIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const timeLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const nowMs = () => Date.now();

const SUGGESTIONS = [
  'Explain a concept from one of my courses',
  'Help me work through a practice problem',
  'What should I study next?',
  'Send a screenshot of an assignment question',
];

function AiAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingImageFile, setPendingImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.get('/assistant/history')
      .then((data) => {
        if (active) setMessages(data.messages || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load chat history');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleImageSelect = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file');
      return;
    }
    setError('');
    if (pendingImage) URL.revokeObjectURL(pendingImage);
    setPendingImage(URL.createObjectURL(file));
    setPendingImageFile(file);
  };

  const clearPendingImage = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage);
    setPendingImage(null);
    setPendingImageFile(null);
  };

  const send = async (overrideText) => {
    const text = overrideText !== undefined ? overrideText : input.trim();
    if ((!text && !pendingImageFile) || sending) return;

    setSending(true);
    setError('');
    setInput('');
    const keepImage = pendingImage;
    const keepImageFile = pendingImageFile;
    setPendingImage(null);
    setPendingImageFile(null);

    const optimistic = {
      id: `local-${nowMs()}`,
      role: 'user',
      content: text || 'Shared an image',
      imageUrl: keepImage,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const formData = new FormData();
      if (text) formData.append('content', text);
      if (keepImageFile) formData.append('image', keepImageFile);

      const data = await api.upload('/assistant/chat', formData);
      setMessages((m) => [
        ...m.filter((item) => item.id !== optimistic.id),
        data.userMessage,
        data.message,
      ]);
    } catch (err) {
      setError(err.message || 'Failed to get a reply. Please try again.');
      setMessages((m) => [
        ...m.filter((item) => item.id !== optimistic.id),
        { ...optimistic, imageUrl: null },
        {
          id: `local-${nowMs()}-err`,
          role: 'assistant',
          content: 'I hit a problem reaching the assistant. Please try again in a moment.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (keepImage) URL.revokeObjectURL(keepImage);
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const assistantAvatar = (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-accent-soft ring-1 ring-inset ring-orange-400/30">
      <SparklesIcon className="h-5 w-5" />
    </div>
  );

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className="relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72">
        <div className="mx-auto max-w-5xl space-y-6">
          <div><BackButton /></div>

          <div className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <div className="flex items-center gap-4">
              {assistantAvatar}
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">AI Study Assistant</p>
                <h1 className="tracking-display font-display mt-1 text-3xl font-medium">Ask Ifeanyi</h1>
                <p className="mt-1 text-sm text-muted">
                  Ask questions with text, or send a photo or screenshot of a question to work through it together.
                </p>
              </div>
            </div>
          </div>

          <section className="flex h-[520px] flex-col rounded-3xl border border-line bg-card p-4 backdrop-blur-xl sm:p-6">
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted">Loading conversations...</p>
              ) : messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted" />
                  <p className="mt-3 text-sm text-muted">
                    Hi, I&apos;m Ifeanyi. Ask me anything about your courses, or send a photo or screenshot of a question.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => {
                          if (suggestion === SUGGESTIONS[3]) fileInputRef.current?.click();
                          else send(suggestion);
                        }}
                        className="rounded-full border border-line px-4 py-2 text-xs font-medium text-muted transition hover:border-orange-400/40 hover:text-accent"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => {
                  const mine = m.role === 'user';
                  return (
                    <div key={m.id} className={`flex gap-3 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && assistantAvatar}
                      <div className={`flex max-w-[75%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                        <div className={`rounded-2xl px-4 py-2.5 ${mine ? 'bg-orange-500 text-white' : 'border border-line bg-page'}`}>
                          {m.imageUrl ? (
                            <img
                              src={m.imageUrl}
                              alt="Attached photo"
                              className="mb-2 max-h-56 w-auto rounded-xl object-contain"
                            />
                          ) : null}
                          <p className={`text-sm whitespace-pre-line ${mine ? 'text-white' : 'text-content'}`}>{m.content}</p>
                        </div>
                        <p className={`mt-1 text-[10px] ${mine ? 'text-faint' : 'text-muted'}`}>{timeLabel(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              {sending ? (
                <div className="flex gap-3 justify-start">
                  {assistantAvatar}
                  <div className="flex items-center gap-2 rounded-2xl border border-line bg-page px-4 py-3">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                    <span className="ml-1 text-xs text-muted">Ifeanyi is thinking...</span>
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            {error ? (
              <p className="mb-3 mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-danger">{error}</p>
            ) : null}

            <div className="mt-4 border-t border-line pt-4">
              {pendingImage ? (
                <div className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-card-strong p-3">
                  <img src={pendingImage} alt="Preview" className="h-16 w-16 rounded-lg object-cover" />
                  <p className="flex-1 text-xs text-muted">Photo ready to send</p>
                  <button
                    type="button"
                    onClick={clearPendingImage}
                    aria-label="Remove attached photo"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-content"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ) : null}

              <div className="flex items-end gap-3">
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach a photo or screenshot"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-muted transition hover:border-orange-400/40 hover:text-accent"
                  >
                    <PhotoIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Take a photo"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line text-muted transition hover:border-orange-400/40 hover:text-accent"
                  >
                    <CameraIcon className="h-5 w-5" />
                  </button>
                </div>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Ifeanyi a question..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-line bg-page px-4 py-3 text-sm text-content outline-none transition focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20"
                />

                <button
                  type="button"
                  onClick={() => send()}
                  disabled={(!input.trim() && !pendingImageFile) || sending}
                  className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
                >
                  <PaperAirplaneIcon className="h-4 w-4" /> Send
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AiAssistant;