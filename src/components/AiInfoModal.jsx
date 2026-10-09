import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { Icon, Spinner } from './UI.jsx';
import Markdown from './ChatBits.jsx';

export default function AiInfoModal({ type, slug, title, sourceUrl, children, onClose }) {
  const { t, lang } = useLang();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;
    setText('');
    setError('');
    setBusy(true);
    api('/api/ai/explain', { method: 'POST', body: { type, slug, language: lang } })
      .then((data) => { if (active) setText(data.text || ''); })
      .catch((err) => { if (active) setError(err.message || t('aiInfo.failed')); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [type, slug, lang, t]);

  useEffect(() => {
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal((
    <div className="overlay modal-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal ai-info-modal" role="dialog" aria-modal="true" aria-labelledby="ai-info-title">
        <header className="drawer-head">
          <div>
            <div className="eyebrow">{t('aiInfo.eyebrow')}</div>
            <h2 id="ai-info-title" style={{ margin: 0, fontSize: 20 }}>{title}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label={t('common.close')}><Icon name="x" size={18} /></button>
        </header>
        <div className="drawer-body">
          {children}
          <section aria-live="polite" style={{ marginTop: 18, padding: 16, borderRadius: 10, background: 'var(--blue-50, #eef5ff)' }}>
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>{t('aiInfo.summary')}</h3>
            {busy ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Spinner size={16} /> {t('aiInfo.generating')}</div> : null}
            {!busy && error ? <p role="alert" style={{ margin: 0 }}>{error}</p> : null}
            {!busy && text ? <div className="markdown"><Markdown text={text} /></div> : null}
            <p style={{ color: 'var(--muted)', fontSize: 12, margin: '10px 0 0' }}>{t('aiInfo.disclaimer')}</p>
          </section>
          {sourceUrl ? <p style={{ marginBottom: 0, marginTop: 14 }}><a className="btn btn-outline btn-sm" href={sourceUrl} target="_blank" rel="noreferrer"><Icon name="globe" size={13} /> {t('contacts.website')}</a></p> : null}
        </div>
      </section>
    </div>
  ), document.body);
}
