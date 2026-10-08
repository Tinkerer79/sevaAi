import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon, Spinner, copyText, useToast } from '../components/UI.jsx';
import Markdown from '../components/ChatBits.jsx';

const SUGGESTED = ['sq.1', 'sq.2', 'sq.3', 'sq.4'];

export default function Assistant() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const prefill = params.get('q') || '';

  const [messages, setMessages] = useState([]); // {role:'user'|'ai', text, error?, id}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [convId, setConvId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const lastSent = useRef('');
  const autoSent = useRef(false);

  const speechSupported = typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

  const scrollDown = () => requestAnimationFrame(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const loadConversations = useCallback(() => {
    if (user) api('/api/ai/conversations').then((d) => setConversations(d.conversations)).catch(() => {});
    else setConversations([]);
  }, [user]);

  useEffect(loadConversations, [loadConversations]);

  const send = useCallback(async (text, { retryOf } = {}) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    lastSent.current = message;
    setInput('');
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text: message, id: Date.now() }, { role: 'ai', text: '', typing: true, id: Date.now() + 1 }]);
    scrollDown();
    try {
      const d = await api('/api/ai/chat', { method: 'POST', body: { message, language: lang, conversationId: convId } });
      if (d.conversationId) setConvId(d.conversationId);
      setMessages((m) => m.map((x) => (x.typing ? { role: 'ai', text: d.reply, servedBy: d.servedBy, id: x.id } : x)));
      if (user) loadConversations();
    } catch (err) {
      const friendly = err instanceof ApiError && err.code === 'AI_BUSY' ? t('assistant.busy') : err.message;
      setMessages((m) => m.map((x) => (x.typing ? { role: 'ai', text: '', error: friendly, id: x.id } : x)));
    } finally {
      setBusy(false);
      scrollDown();
    }
  }, [input, busy, lang, convId, user, t]);

  // Auto-send prefill from hero search / Ask AI buttons (once)
  useEffect(() => {
    if (prefill && !autoSent.current) {
      autoSent.current = true;
      send(prefill);
      // clean the URL so refresh doesn't resend
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    setMessages((m) => m.filter((x) => !x.error));
    send(lastSent.current);
  };

  const clearChat = () => { setMessages([]); setConvId(null); lastSent.current = ''; };

  const openConversation = async (id) => {
    try {
      const d = await api(`/api/ai/conversations/${id}`);
      setConvId(d.conversation.id);
      setMessages(d.messages.map((m, i) => ({ role: m.role === 'model' ? 'ai' : 'user', text: m.content, id: i })));
      scrollDown();
    } catch { /* ignore */ }
  };

  const deleteConversation = async (e, id) => {
    e.stopPropagation();
    await api(`/api/ai/conversations/${id}`, { method: 'DELETE' }).catch(() => {});
    if (convId === id) clearChat();
    loadConversations();
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = false;
    setListening(true);
    rec.onresult = (e) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
  };

  const copy = async (text) => { await copyText(text); toast(t('common.copied')); };

  return (
    <div className="page container" style={{ paddingTop: 28 }}>
      <div className="section-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">SevaManipur · Assistant</div>
          <h2>{t('assistant.title')}</h2>
          <p>{t('assistant.sub')}</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={clearChat}><Icon name="trash" size={14} /> {t('common.clear')}</button>
      </div>

      <div className="chat-shell">
        <aside className="chat-side">
          <div className="card" style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assistant.suggested')}</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {SUGGESTED.map((k) => (
                <button key={k} className="suggest" onClick={() => send(t(k))}>{t(k)}</button>
              ))}
            </div>
          </div>

          {user ? (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('assistant.history')}</h4>
                <button className="btn btn-ghost btn-sm" onClick={clearChat} style={{ padding: '2px 8px' }}><Icon name="plus" size={14} /></button>
              </div>
              {conversations.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{t('dash.emptyChats')}</p>
              ) : (
                <div style={{ display: 'grid', gap: 5, maxHeight: 300, overflowY: 'auto' }}>
                  {conversations.map((c) => (
                    <div key={c.id} onClick={() => openConversation(c.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 9, cursor: 'pointer', background: convId === c.id ? 'var(--blue-50)' : 'transparent' }}>
                      <Icon name="chat" size={14} style={{ flexShrink: 0, color: 'var(--muted)' }} />
                      <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                      <button onClick={(e) => deleteConversation(e, c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 3 }} aria-label="Delete">
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 16, fontSize: 13.5, color: 'var(--muted)' }}>
              <Icon name="info" size={16} style={{ verticalAlign: '-3px', color: 'var(--blue-500)' }} />{' '}
              <Link to="/login">{t('nav.login')}</Link> — {t('assistant.loginForHistory')}
            </div>
          )}
        </aside>

        <div className="card chat-main">
          <div className="chat-scroll" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="empty" style={{ margin: 'auto' }}>
                <div className="big"><Icon name="chat" size={40} style={{ opacity: 0.5 }} /></div>
                <h3>{t('assistant.title')}</h3>
                <p style={{ maxWidth: 380, margin: '6px auto 0' }}>{t('assistant.sub')}</p>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`}>
                <span className="avatar"><Icon name={m.role === 'user' ? 'user' : 'chat'} size={16} /></span>
                <div>
                  <div className="bubble">
                    {m.typing ? (
                      <span className="typing"><i /><i /><i /></span>
                    ) : m.error ? (
                      <span style={{ color: 'var(--red-600)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Icon name="alert" size={15} /> {m.error}
                      </span>
                    ) : (
                      <Markdown text={m.text} />
                    )}
                  </div>
                  {m.role === 'ai' && m.text && !m.typing && (
                    <div className="msg-actions">
                      <button onClick={() => copy(m.text)}><Icon name="copy" size={12} /> {t('common.copy')}</button>
                      {m.servedBy && <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>· {m.servedBy}</span>}
                    </div>
                  )}
                  {m.error && (
                    <div className="msg-actions">
                      <button onClick={retry}><Icon name="refresh" size={12} /> {t('common.retry')}</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-input">
            <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t('assistant.placeholder')} rows={1}
                maxLength={2000} aria-label={t('assistant.placeholder')}
              />
              {speechSupported && (
                <button type="button" className={`btn ${listening ? 'btn-danger' : 'btn-outline'} btn-icon`} onClick={startVoice}
                  title={listening ? t('assistant.listening') : t('assistant.voice')} aria-label={t('assistant.voice')}>
                  <Icon name="mic" size={17} />
                </button>
              )}
              <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
                {busy ? <Spinner size={16} /> : <Icon name="send" size={17} />}
              </button>
            </form>
            <div className="chat-note">
              <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{t('assistant.disclaimer')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
