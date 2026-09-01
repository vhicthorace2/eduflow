import { useEffect, useMemo, useState } from 'react';
import api, { userStore } from '../api/client.js';
import Sidebar from '../component/sidebar.jsx';
import BackButton from '../component/backButton.jsx';
import { MagnifyingGlassIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const current = () => userStore.get();

const avatarFor = (user) => {
  const src = user?.avatar;
  if (src) return <img src={src} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-inset ring-orange-400/30" />;
  const initials = (user?.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 font-semibold text-accent-soft ring-1 ring-inset ring-orange-400/30">
      {initials || '?'}
    </div>
  );
};

const timeLabel = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function MessagesView() {
  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [search, setSearch] = useState('');
  const [directory, setDirectory] = useState([]);
  const [picked, setPicked] = useState(null);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [sending, setSending] = useState(false);

  const me = current();

  const load = () => {
    api.get('/messages?folder=all')
      .then((data) => setConversations(data.messages || []))
      .catch((err) => setError(err.message || 'Failed to load messages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    api.get('/messages?folder=all')
      .then((data) => { if (active) setConversations(data.messages || []); })
      .catch((err) => { if (active) setError(err.message || 'Failed to load messages'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    conversations.forEach((msg) => {
      const other = msg.sender?.id === me?.id ? msg.recipient : msg.sender;
      if (!other || other.id == null) return;
      if (!map.has(other.id)) {
        map.set(other.id, { user: other, messages: [] });
      }
      map.get(other.id).messages.push(msg);
    });
    return [...map.values()].map((conv) => {
      conv.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const last = conv.messages[conv.messages.length - 1];
      const unread = conv.messages.filter((m) => m.sender?.id !== me?.id && !m.isRead).length;
      return { ...conv, last, unread };
    }).sort((a, b) => new Date(b.last.createdAt) - new Date(a.last.createdAt));
  }, [conversations, me]);

  const selectConversation = (conv) => {
    setSelected(conv);
    conv.messages.forEach((m) => {
      if (m.sender?.id !== me?.id && !m.isRead) {
        api.put(`/messages/${m.id}/read`).catch(() => {});
        m.isRead = true;
      }
    });
  };

  const openCompose = () => {
    setComposing(true);
    setSearch('');
    setPicked(null);
    setSubject('');
    setDraft('');
  };

  const pick = (u) => {
    setPicked(u);
    setSubject(`Message to ${u.name}`);
  };

  const searchDirectory = (term) => {
    setSearch(term);
    api.get(`/messages/users${term ? `?search=${encodeURIComponent(term)}` : ''}`)
      .then((data) => setDirectory(data.users || []))
      .catch(() => setDirectory([]));
  };

  const send = () => {
    if (!picked || !draft.trim()) return;
    setSending(true);
    api.post('/messages', {
      recipientEmail: picked.email,
      subject: subject.trim() || `Message to ${picked.name}`,
      content: draft.trim()
    })
      .then(() => {
        setComposing(false);
        setDraft('');
        setSubject('');
        setPicked(null);
        setError('');
        load();
      })
      .catch((err) => setError(err.message || 'Failed to send'))
      .finally(() => setSending(false));
  };

  const reply = () => {
    if (!replyDraft.trim() || !selected) return;
    const last = selected.messages[selected.messages.length - 1];
    api.post(`/messages/${last.id}/reply`, { content: replyDraft.trim() })
      .then(() => {
        setReplyDraft('');
        setError('');
        load();
      })
      .catch((err) => setError(err.message || 'Failed to reply'));
  };

  return (
    <div className="relative min-h-screen bg-page text-content">
      <div className="pointer-events-none absolute -left-40 top-0 h-[24rem] w-[24rem] rounded-full bg-orange-500/10 blur-[120px]" />
      <Sidebar />
      <div className="relative px-6 pb-10 pt-20 sm:px-8 md:pt-10 lg:px-16 md:ml-72">
        <div className="mx-auto max-w-6xl space-y-6">
          <div><BackButton /></div>

          <header className="shadow-panel relative overflow-hidden rounded-3xl border border-line bg-card p-8 sm:p-10">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/40" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/20 ring-1 ring-inset ring-orange-400/30">
                <EnvelopeIcon className="h-7 w-7 text-accent-mid" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent-mid">Messaging</p>
                <h1 className="tracking-display font-display mt-2 text-3xl font-medium">Messages</h1>
                <p className="mt-2 text-muted">Chat with students and instructors.</p>
              </div>
            </div>
          </header>

          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-danger">{error}</p>}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <section className="rounded-3xl border border-line bg-card p-5 backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Conversations</h2>
              <button
                type="button"
                onClick={openCompose}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                <PaperAirplaneIcon className="h-5 w-5" /> New Message
              </button>
              <div className="mt-5 space-y-1">
                {loading ? (
                  <p className="text-sm text-muted">Loading...</p>
                ) : grouped.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">No conversations yet.</p>
                ) : (
                  grouped.map((conv) => (
                    <button
                      key={conv.user.id}
                      type="button"
                      onClick={() => selectConversation(conv)}
                      className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
                        selected?.user.id === conv.user.id ? 'bg-orange-500/15 ring-1 ring-inset ring-orange-400/30' : 'hover:bg-card-hover'
                      }`}
                    >
                      {avatarFor(conv.user)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{conv.user.name}</p>
                        <p className="truncate text-xs text-muted">{conv.last.content}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-muted">{timeLabel(conv.last.createdAt)}</span>
                        {conv.unread > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">{conv.unread}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </section>

            <section className="min-h-[28rem] rounded-3xl border border-line bg-card p-5 backdrop-blur-xl">
              {composing ? (
                <div>
                  <h2 className="text-lg font-semibold">New Message</h2>
                  {picked ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-page p-3">
                      {avatarFor(picked)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{picked.name}</p>
                        <p className="truncate text-xs text-muted">{picked.email}</p>
                      </div>
                      <button type="button" onClick={() => setPicked(null)} className="text-xs text-muted hover:text-content">Change</button>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="relative">
                        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                        <input
                          value={search}
                          onChange={(e) => searchDirectory(e.target.value)}
                          placeholder="Search name or email..."
                          className="w-full rounded-xl border border-line bg-page px-10 py-3 text-sm outline-none transition focus:border-orange-400/60"
                        />
                      </div>
                      <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                        {directory.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => pick(u)}
                            className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-card-hover"
                          >
                            {avatarFor(u)}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{u.name}</p>
                              <p className="truncate text-xs text-muted">{u.email}</p>
                            </div>
                            <span className="text-xs capitalize text-accent-mid">{u.role}</span>
                          </button>
                        ))}
                        {directory.length === 0 && <p className="py-4 text-center text-sm text-muted">No users found.</p>}
                      </div>
                    </div>
                  )}
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="mt-4 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-none transition focus:border-orange-400/60"
                  />
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write your message..."
                    rows={4}
                    className="mt-3 w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-none transition focus:border-orange-400/60"
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => { setComposing(false); setPicked(null); }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-muted transition hover:text-content">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={send}
                      disabled={!picked || !draft.trim() || sending}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" /> {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </div>
              ) : selected ? (
                <div className="flex h-full flex-col">
                  <div className="flex items-center gap-3 border-b border-line pb-4">
                    {avatarFor(selected.user)}
                    <div>
                      <p className="text-sm font-semibold">{selected.user.name}</p>
                      <p className="text-xs text-muted capitalize">{selected.user.role}</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3 py-4">
                    {selected.messages.map((m) => {
                      const mine = m.sender?.id === me?.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-orange-500 text-white' : 'border border-line bg-page'}`}>
                            <p className="text-sm">{m.content}</p>
                            <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{timeLabel(m.createdAt)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <textarea
                    value={replyDraft}
                    onChange={(e) => setReplyDraft(e.target.value)}
                    placeholder="Reply..."
                    rows={2}
                    className="mt-auto w-full rounded-xl border border-line bg-page px-4 py-3 text-sm outline-none transition focus:border-orange-400/60"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={reply}
                      disabled={!replyDraft.trim()}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" /> Reply
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 text-muted" />
                  <p className="mt-3 text-sm text-muted">Select a conversation or start a new message.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessagesView;
