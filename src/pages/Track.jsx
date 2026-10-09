import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { Icon, Empty, StatusBadge, PriorityBadge } from '../components/UI.jsx';
import { ComplaintTimeline } from '../components/ChatBits.jsx';

const DEMO_IDS = ['SM-2026-10482', 'SM-2026-10893', 'SM-2026-10975'];

export default function Track() {
  const { t } = useLang();
  const [params] = useSearchParams();
  const [input, setInput] = useState(params.get('id') || '');
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const track = async (id) => {
    const cid = (id ?? input).trim().toUpperCase();
    if (!cid) return;
    setLastQuery(cid);
    setBusy(true);
    setNotFound(false);
    setData(null);
    try {
      const d = await api(`/api/complaints/track/${encodeURIComponent(cid)}`);
      setData(d);
    } catch {
      setNotFound(true);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (params.get('id')) track(params.get('id'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 760 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{t('track.eyebrow')}</div>
          <h2>{t('track.title')}</h2>
          <p>{t('track.sub')}</p>
        </div>
      </div>

      <form className="card" style={{ padding: 22, display: 'flex', gap: 10, flexWrap: 'wrap' }}
        onSubmit={(e) => { e.preventDefault(); track(); }}>
        <input className="input" style={{ flex: 1, minWidth: 200, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('track.placeholder')} aria-label={t('track.id')} />
        <button className="btn btn-primary" type="submit" disabled={busy}>
          <Icon name="search" size={16} /> {busy ? t('common.loading') : t('track.button')}
        </button>
      </form>

      <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {t('track.try')}
        {DEMO_IDS.map((id) => (
          <button key={id} className="chip" style={{ background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--border)' }}
            onClick={() => { setInput(id); track(id); }}>
            {id}
          </button>
        ))}
      </div>

      {busy && <div className="skeleton" style={{ height: 260, marginTop: 22 }} />}

      {notFound && !busy && (
        <div className="card" style={{ marginTop: 22 }}>
          <Empty icon="alert" title={t('track.notFound')} sub={<Link to="/report">{t('report.title')} →</Link>} />
        </div>
      )}

      {data && !busy && (
        <div style={{ marginTop: 22 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 21, letterSpacing: '0.02em' }}>{data.complaint.complaint_id}</h3>
                <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
                  <Icon name="building" size={14} style={{ verticalAlign: '-3px' }} /> {data.complaint.dept_name || '—'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <StatusBadge status={data.complaint.status} />
                <PriorityBadge priority={data.complaint.priority} />
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: 18, gap: 10 }}>
              <div><b style={{ fontSize: 12.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('common.category')}</b>
                <div style={{ fontSize: 14.5 }}>{t(`cat.${data.complaint.category}`)}</div></div>
              <div><b style={{ fontSize: 12.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('common.location')}</b>
                <div style={{ fontSize: 14.5 }}>{data.complaint.location}, {data.complaint.district}</div></div>
              <div><b style={{ fontSize: 12.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('common.date')}</b>
                <div style={{ fontSize: 14.5 }}>{new Date(data.complaint.created_at + 'Z').toLocaleDateString(undefined, { dateStyle: 'long' })}</div></div>
              <div><b style={{ fontSize: 12.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('track.current')}</b>
                <div style={{ fontSize: 14.5 }}><StatusBadge status={data.complaint.status} /></div></div>
            </div>
            <p style={{ margin: '16px 0 0', fontSize: 14.5, background: 'var(--bg)', borderRadius: 11, padding: '11px 15px' }}>{data.complaint.description}</p>
          </div>

          <div className="card" style={{ padding: 24, marginTop: 16 }}>
            <h4 style={{ marginTop: 0, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>{t('track.updates')}</h4>
            <ComplaintTimeline status={data.complaint.status} updates={data.updates} t={t} />
          </div>
        </div>
      )}
    </div>
  );
}
