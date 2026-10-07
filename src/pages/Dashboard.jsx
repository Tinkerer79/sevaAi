import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon, Empty, StatusBadge, PriorityBadge } from '../components/UI.jsx';
import { ComplaintTimeline } from '../components/ChatBits.jsx';

export default function Dashboard() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('complaints');
  const [complaints, setComplaints] = useState(null);
  const [saves, setSaves] = useState({ services: [], schemes: [] });
  const [chats, setChats] = useState([]);
  const [openComplaint, setOpenComplaint] = useState(null);
  const [detail, setDetail] = useState(null);
  const [openChat, setOpenChat] = useState(null);
  const [chatMsgs, setChatMsgs] = useState(null);

  useEffect(() => {
    if (!user) return;
    api('/api/complaints/mine').then((d) => setComplaints(d.complaints)).catch(() => setComplaints([]));
    api('/api/saves/mine').then(setSaves).catch(() => {});
    api('/api/ai/conversations').then((d) => setChats(d.conversations)).catch(() => {});
  }, [user]);

  useEffect(() => {
    // Redirect in an effect — calling navigate() during render is a React
    // Router anti-pattern and can break the render under StrictMode.
    if (!user) navigate('/login', { replace: true });
  }, [user, navigate]);

  if (!user) return null;

  const openDetail = async (id) => {
    setOpenComplaint(id);
    setDetail(null);
    try { setDetail((await api(`/api/complaints/track/${id}`))); } catch { setDetail(null); }
  };

  const viewChat = async (id) => {
    setOpenChat(id);
    setChatMsgs(null);
    try { const d = await api(`/api/ai/conversations/${id}`); setChatMsgs(d.messages); } catch { setChatMsgs([]); }
  };

  if (!user) return null;

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 1000 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{t('dash.welcome')}, {user.name}</div>
          <h2>{t('dash.title')}</h2>
        </div>
      </div>

      <div className="tabs">
        {[['complaints', t('dash.complaints')], ['services', t('dash.savedServices')], ['schemes', t('dash.savedSchemes')], ['chats', t('dash.chats')]].map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'complaints' && (
        !complaints ? <div className="skeleton" style={{ height: 200 }} /> :
        complaints.length === 0 ? (
          <Empty icon="pin" title={t('dash.emptyComplaints')} sub={<Link to="/report">{t('report.title')} →</Link>} />
        ) : (
          <div className="table-wrap card">
            <table className="tbl">
              <thead><tr><th>ID</th><th>{t('common.category')}</th><th>{t('common.location')}</th><th>{t('common.date')}</th><th>{t('common.status')}</th></tr></thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c.complaint_id} onClick={() => openDetail(c.complaint_id)}>
                    <td><b>{c.complaint_id}</b></td>
                    <td>{t(`cat.${c.category}`)}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.location}, {c.district}</td>
                    <td>{new Date(c.created_at + 'Z').toLocaleDateString()}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'services' && (
        saves.services.length === 0 ? <Empty icon="bookmark" title={t('dash.emptyServices')} sub={<Link to="/services">{t('services.title')} →</Link>} /> : (
          <div className="grid grid-3">
            {saves.services.map((s) => (
              <Link key={s.id} to={`/services/${s.slug}`} className="card card-hover" style={{ padding: 18, color: 'inherit', textDecoration: 'none' }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{s.name}</h4>
                <span className="badge badge-blue">{s.category}</span>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === 'schemes' && (
        saves.schemes.length === 0 ? <Empty icon="shield" title={t('dash.emptySchemes')} sub={<Link to="/schemes">{t('schemes.title')} →</Link>} /> : (
          <div className="grid grid-2">
            {saves.schemes.map((s) => (
              <div key={s.id} className="card" style={{ padding: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{s.name}</h4>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>{s.benefits.slice(0, 120)}…</p>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'chats' && (
        chats.length === 0 ? <Empty icon="chat" title={t('dash.emptyChats')} sub={<Link to="/assistant">{t('assistant.title')} →</Link>} /> : (
          <div className="grid grid-2">
            {chats.map((c) => (
              <button key={c.id} className="card card-hover" style={{ padding: 18, textAlign: 'left', cursor: 'pointer', border: openChat === c.id ? '1.5px solid var(--blue-500)' : undefined }}
                onClick={() => viewChat(c.id)}>
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <Icon name="chat" size={15} style={{ color: 'var(--blue-600)' }} />
                  <b style={{ fontSize: 14 }}>{c.title}</b>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                  {new Date(c.created_at + 'Z').toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        )
      )}

      {chatMsgs && (
        <div className="overlay" onClick={() => setOpenChat(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <b>{chats.find((c) => c.id === openChat)?.title}</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpenChat(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="drawer-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {!chatMsgs ? <div className="skeleton" style={{ height: 120 }} /> : chatMsgs.map((m, i) => (
                <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'ai'}`} style={{ maxWidth: '100%' }}>
                  <span className="avatar"><Icon name={m.role === 'user' ? 'user' : 'chat'} size={15} /></span>
                  <div className="bubble" style={{ fontSize: 13.8, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {openComplaint && (
        <div className="overlay" onClick={() => setOpenComplaint(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <b>{openComplaint}</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpenComplaint(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="drawer-body">
              {!detail ? <div className="skeleton" style={{ height: 200 }} /> : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <StatusBadge status={detail.complaint.status} />
                    <PriorityBadge priority={detail.complaint.priority} />
                    <span className="badge badge-grey">{t(`cat.${detail.complaint.category}`)}</span>
                  </div>
                  <p style={{ fontSize: 14.5, background: '#fff', border: '1px solid var(--border)', borderRadius: 11, padding: '12px 15px' }}>
                    {detail.complaint.description}
                  </p>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
                    <Icon name="pin" size={14} style={{ verticalAlign: '-3px' }} /> {detail.complaint.location}, {detail.complaint.district}
                  </p>
                  <ComplaintTimeline status={detail.complaint.status} updates={detail.updates} t={t} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
