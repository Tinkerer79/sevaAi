import { useCallback, useEffect, useState } from 'react';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { api, API_BASE } from '../api.js';
import { useNavigate } from 'react-router-dom';
import { Icon, Empty, StatusBadge, PriorityBadge, Spinner, useToast } from '../components/UI.jsx';
import Markdown from '../components/ChatBits.jsx';

function BarChart({ title, data, formatter = (x) => x }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  return (
    <div className="card" style={{ padding: 22 }}>
      <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
      {data.length === 0 ? <Empty title="No data yet" /> : data.slice(0, 8).map((d) => (
        <div className="bar-row" key={d.key}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={formatter(d.key)}>{formatter(d.key)}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width: `${(d.n / max) * 100}%` }} /></div>
          <b style={{ textAlign: 'right' }}>{d.n}</b>
        </div>
      ))}
    </div>
  );
}

function Donut({ title, data }) {
  const colors = { Submitted: '#94a3b8', Received: '#2563eb', Assigned: '#06b6d4', 'Under Review': '#d97706', Resolved: '#059669' };
  const total = data.reduce((a, b) => a + b.n, 0) || 1;
  let acc = 0;
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="card" style={{ padding: 22 }}>
      <h4 style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h4>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <svg width="130" height="130" viewBox="0 0 130 130">
          <circle cx="65" cy="65" r={R} fill="none" stroke="#eef2f8" strokeWidth="15" />
          {data.map((d) => {
            const frac = d.n / total;
            const el = (
              <circle key={d.key} cx="65" cy="65" r={R} fill="none" stroke={colors[d.key] || '#94a3b8'} strokeWidth="15"
                strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C} transform="rotate(-90 65 65)" strokeLinecap="butt" />
            );
            acc += frac;
            return el;
          })}
          <text x="65" y="70" textAnchor="middle" fontSize="21" fontWeight="800" fill="#0f172a">{total}</text>
        </svg>
        <div style={{ display: 'grid', gap: 7, fontSize: 13 }}>
          {data.map((d) => (
            <span key={d.key} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <i style={{ width: 11, height: 11, borderRadius: 3, background: colors[d.key] || '#94a3b8' }} /> {d.key} · <b>{d.n}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function KeysPanel() {
  const { t } = useLang();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [testing, setTesting] = useState(null);
  const [liveBusy, setLiveBusy] = useState(false);
  const [liveResult, setLiveResult] = useState(null);

  const load = useCallback(() => api('/api/admin/ai/keys').then(setData).catch(() => {}), []);
  // Wrap the call — the effect must return nothing. Returning `load`'s promise
  // made React call that promise as the effect cleanup on unmount, which threw
  // "TypeError: n is not a function" and unmounted the whole app.
  useEffect(() => { load(); }, [load]);

  const act = async (id, action) => {
    if (action === 'test') {
      setTesting(id);
      try {
        const d = await api(`/api/admin/ai/keys/${id}/test`, { method: 'POST' });
        toast(d.test.ok ? `${id}: OK (${d.test.latencyMs}ms)` : `${id}: ${d.test.message}`, d.test.ok ? 'success' : 'error');
        load();
      } catch (e) { toast(e.message, 'error'); }
      setTesting(null);
      return;
    }
    try {
      await api(`/api/admin/ai/keys/${id}/${action}`, { method: 'POST' });
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  const runLive = async () => {
    setLiveBusy(true); setLiveResult(null);
    try { setLiveResult(await api('/api/admin/ai/live-test', { method: 'POST' })); }
    catch (e) { setLiveResult({ ok: false, message: e.message }); }
    setLiveBusy(false);
  };

  const fmtTime = (ts) => !ts ? t('admin.never') : Math.round((Date.now() - ts) / 60000) >= 1 ? `${Math.round((Date.now() - ts) / 60000)} min ago` : 'just now';

  if (!data) return <div className="skeleton" style={{ height: 220 }} />;

  return (
    <>
      <div className="card" style={{ padding: 20, marginBottom: 16, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="badge badge-violet"><Icon name="settings" size={13} /> Model: <b style={{ marginLeft: 3 }}>{data.model}</b></span>
          <label style={{ fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'center' }}>
            {t('admin.strategy')}:
            <select className="select" style={{ width: 'auto', padding: '7px 10px', fontSize: 13.5 }} value={data.strategy}
              onChange={async (e) => { await api('/api/admin/ai/strategy', { method: 'POST', body: { strategy: e.target.value } }); toast(`Strategy: ${e.target.value}`); load(); }}>
              <option value="failover">failover</option>
              <option value="round_robin">round_robin</option>
            </select>
          </label>
        </div>
        <button className="btn btn-primary btn-sm" onClick={runLive} disabled={liveBusy}>
          {liveBusy ? <Spinner size={14} /> : <Icon name="activity" size={14} />} {t('admin.liveTest')}
        </button>
      </div>

      {liveResult && (
        <div className="card" style={{ padding: 16, marginBottom: 16, border: `1.5px solid ${liveResult.ok ? 'var(--green-600)' : 'var(--red-600)'}` }}>
          {liveResult.ok ? (
            <span style={{ color: 'var(--green-600)', fontWeight: 600 }}><Icon name="check" size={15} style={{ verticalAlign: '-3px' }} /> Live AI test passed — served by {liveResult.servedBy}: “{liveResult.sample}”</span>
          ) : (
            <span style={{ color: 'var(--red-600)', fontWeight: 600 }}><Icon name="alert" size={15} style={{ verticalAlign: '-3px' }} /> Live AI test failed: {liveResult.message}</span>
          )}
        </div>
      )}

      <div className="table-wrap card">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t('admin.keys')}</th><th>{t('admin.keyStatus')}</th><th style={{ textAlign: 'right' }}>{t('admin.keyRequests')}</th>
              <th style={{ textAlign: 'right' }}>{t('admin.keyErrors')}</th><th>{t('admin.keyLastUsed')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.keys.map((k) => (
              <tr key={k.id} style={{ cursor: 'default' }}>
                <td><b>{k.label}</b> <span style={{ color: 'var(--muted)', fontSize: 12.5 }}>{k.masked}</span></td>
                <td>
                  <span style={{ textTransform: 'capitalize' }}><span className={`key-dot ${k.status}`} />{k.status}</span>
                  {k.status === 'cooldown' && <div style={{ fontSize: 11.5, color: 'var(--amber-600)' }}>{t('admin.cooldownEnds')} in {Math.ceil(k.cooldownRemainingMs / 1000)}s</div>}
                  {k.lastError && <div style={{ fontSize: 11.5, color: 'var(--red-600)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={k.lastError}>{k.lastError}</div>}
                </td>
                <td style={{ textAlign: 'right' }}>{k.requests}</td>
                <td style={{ textAlign: 'right' }}>{k.errors}</td>
                <td>{fmtTime(k.lastUsedAt)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    {testing === k.id ? <Spinner size={15} /> : (
                      <button className="btn btn-outline btn-sm" onClick={() => act(k.id, 'test')}>{t('admin.testKey')}</button>
                    )}
                    {k.status === 'active' ? (
                      <button className="btn btn-danger btn-sm" onClick={() => act(k.id, 'disable')}>{t('admin.disable')}</button>
                    ) : (
                      <button className="btn btn-green btn-sm" onClick={() => act(k.id, 'enable')}>{t('admin.enable')}</button>
                    )}
                    {(k.status === 'cooldown' || k.status === 'invalid') && (
                      <button className="btn btn-outline btn-sm" onClick={() => act(k.id, 'reset')}>{t('admin.resetCooldown')}</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 10 }}>
        <Icon name="lock" size={13} style={{ verticalAlign: '-2px' }} /> Full key values are stored only in server environment variables and are never displayed, logged or sent to the browser.
      </p>
    </>
  );
}

function ComplaintsPanel({ request = api }) {
  const { t, lang } = useLang();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [depts, setDepts] = useState([]);
  const [form, setForm] = useState({ status: '', priority: '', dept_name: '', note: '' });
  const [summary, setSummary] = useState('');
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (search.trim()) p.set('search', search.trim());
    request(`/api/admin/complaints?${p}`).then((d) => setRows(d.complaints)).catch(() => setRows([]));
  }, [status, search, request]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { request('/api/admin/departments').then((d) => setDepts(d.departments)).catch(() => {}); }, [request]);

  const summarize = async () => {
    setSummaryBusy(true); setSummaryError(''); setSummary('');
    try {
      const result = await request('/api/admin/complaints/summary', { method: 'POST', body: { language: lang } });
      setSummary(result.summary || '');
    } catch (error) { setSummaryError(error.message || t('admin.summaryError')); }
    finally { setSummaryBusy(false); }
  };

  const openDetail = async (id) => {
    setOpenId(id); setDetail(null);
    try {
      const d = await request(`/api/admin/complaints/${id}`);
      setDetail(d);
      setForm({ status: d.complaint.status, priority: d.complaint.priority, dept_name: d.complaint.dept_name || '', note: '' });
    } catch { setDetail(null); }
  };

  const save = async () => {
    try {
      await request(`/api/admin/complaints/${openId}`, { method: 'PATCH', body: form });
      toast(`Complaint ${openId} updated`);
      setForm((f) => ({ ...f, note: '' }));
      openDetail(openId);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['', 'Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'].map((s) => (
            <button key={s || 'all'} className={`chip ${status === s ? '' : ''}`}
              style={status === s ? { background: 'var(--blue-600)', color: '#fff', borderColor: 'var(--blue-600)' } : { background: '#fff', color: 'var(--ink)', borderColor: 'var(--border)' }}
              onClick={() => setStatus(s)}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <input className="input" style={{ flex: 1, minWidth: 160, width: 'auto' }} placeholder="Search ID / location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={summarize} disabled={summaryBusy}>
          {summaryBusy ? <Spinner size={14} /> : <Icon name="sparkle" size={14} />} {summaryBusy ? t('admin.summarizing') : t('admin.summarize')}
        </button>
      </div>
      {summaryError ? <div className="tile-warn" role="alert" style={{ padding: 12, borderRadius: 8, marginBottom: 14 }}>{summaryError}</div> : null}
      {summary ? <section className="card" aria-live="polite" style={{ padding: 18, marginBottom: 14 }}>
        <h3 style={{ fontSize: 16 }}>{t('admin.summaryTitle')}</h3>
        <div className="markdown"><Markdown text={summary} /></div>
      </section> : null}

      {!rows ? <div className="skeleton" style={{ height: 220 }} /> : rows.length === 0 ? <Empty title="No complaints found" /> : (
        <div className="table-wrap card">
          <table className="tbl">
            <thead><tr><th>ID</th><th>{t('common.category')}</th><th>{t('common.location')}</th><th>{t('common.date')}</th><th>{t('common.priority')}</th><th>{t('common.status')}</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.complaint_id} onClick={() => openDetail(c.complaint_id)}>
                  <td><b>{c.complaint_id}</b></td>
                  <td>{t(`cat.${c.category}`)}</td>
                  <td style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.location}, {c.district}</td>
                  <td>{new Date(c.created_at + 'Z').toLocaleDateString()}</td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && (
        <div className="overlay" onClick={() => setOpenId(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <b>{openId}</b>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpenId(null)}><Icon name="x" size={16} /></button>
            </div>
            <div className="drawer-body">
              {!detail ? <div className="skeleton" style={{ height: 240 }} /> : (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <StatusBadge status={detail.complaint.status} />
                    <PriorityBadge priority={detail.complaint.priority} />
                    <span className="badge badge-grey">{detail.complaint.name} · {detail.complaint.phone}</span>
                  </div>
                  <p style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 11, padding: '12px 15px', fontSize: 14.5 }}>{detail.complaint.description}</p>
                  <p style={{ color: 'var(--muted)', fontSize: 13.5, display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Icon name="pin" size={14} /> {detail.complaint.location}, {detail.complaint.district}
                  </p>

                  {detail.complaint.photo ? (
                    <details style={{ marginBottom: 14 }}>
                      <summary style={{ cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>{t('admin.viewImage')}</summary>
                      <img crossOrigin="use-credentials" src={`${API_BASE}/api/admin/complaints/${openId}/photo`} alt="Complaint" style={{ marginTop: 10, borderRadius: 12, border: '1px solid var(--border)', maxHeight: 300 }} />
                    </details>
                  ) : <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t('admin.noPhoto')}</p>}

                  <div className="grid grid-2" style={{ gap: 10 }}>
                    <div className="field">
                      <label className="label">{t('common.status')}</label>
                      <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        {detail.statuses.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label className="label">{t('common.priority')}</label>
                      <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                        {detail.priorities.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label className="label">{t('admin.assignee')}</label>
                    <select className="select" value={form.dept_name} onChange={(e) => setForm({ ...form, dept_name: e.target.value })}>
                      <option value="">— {t('common.department')} —</option>
                      {depts.map((d) => <option key={d.name}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">{t('admin.notes')}</label>
                    <textarea className="textarea" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder={t('admin.notePlaceholder')} style={{ minHeight: 70 }} />
                  </div>
                  <button className="btn btn-primary" onClick={save}><Icon name="check" size={15} /> {t('admin.update')}</button>

                  <h4 style={{ margin: '24px 0 12px', fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('track.updates')}</h4>
                  <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 13, padding: 16 }}>
                    {detail.updates.map((u, i) => (
                      <div key={i} style={{ paddingBottom: i < detail.updates.length - 1 ? 12 : 0, borderBottom: i < detail.updates.length - 1 ? '1px solid var(--border)' : 'none', marginBottom: i < detail.updates.length - 1 ? 12 : 0 }}>
                        <b style={{ fontSize: 13.5 }}><StatusBadge status={u.status} /></b>
                        <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '5px 0' }}>
                          {new Date(u.created_at + 'Z').toLocaleString()} · {u.created_by}
                        </div>
                        <div style={{ fontSize: 13.5 }}>{u.note}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 14 }}>
                    <Icon name="map" size={13} style={{ verticalAlign: '-2px' }} /> {t('admin.mapNote')}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Admin() {
  const { t } = useLang();
  const { user, authClient } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const request = useCallback(async (path, options = {}) => {
    let headers = options.headers || {};
    if (authClient) {
      const { data } = await authClient.auth.getSession();
      if (data.session?.access_token) headers = { ...headers, Authorization: `Bearer ${data.session.access_token}` };
    }
    return api(path, { ...options, headers });
  }, [authClient]);

  useEffect(() => {
    if (user && user.role === 'admin') request('/api/admin/stats').then(setStats).catch(() => {});
  }, [user, tab, request]);

  if (user && user.role !== 'admin') {
    return <div className="page container"><Empty icon="lock" title="Admin access required" sub="Log in with an administrator account." /></div>;
  }

  const statusData = stats ? Object.entries(stats.byStatus).map(([key, n]) => ({ key, n })) : [];
  const statusOrder = ['Submitted', 'Received', 'Assigned', 'Under Review', 'Resolved'];
  statusData.sort((a, b) => statusOrder.indexOf(a.key) - statusOrder.indexOf(b.key));

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 1150 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Administration</div>
          <h2>{t('admin.title')}</h2>
        </div>
        <span className="badge badge-violet"><Icon name="activity" size={13} /> {stats?.aiHealth ? `${stats.aiHealth.active}/${stats.aiHealth.total} AI keys active · ${stats.aiHealth.strategy}` : '…'}</span>
      </div>

      <div className="tabs">
        {[['overview', t('admin.overview')], ['complaints', t('admin.complaints')], ['keys', t('admin.aiHealth')]].map(([k, label]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        !stats ? <div className="skeleton" style={{ height: 300 }} /> : (
          <>
            <div className="stat-cards">
              {[['admin.total', stats.total, 'grid'], ['admin.pending', stats.pending, 'clock'], ['admin.review', stats.underReview + stats.assigned, 'eye'], ['admin.resolved', stats.resolved, 'check'], ['admin.high', stats.highPriority, 'alert']].map(([k, v, icon]) => (
                <div key={k} className="card stat-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="k">{t(k)}</span>
                    <Icon name={icon} size={17} style={{ color: 'var(--blue-500)' }} />
                  </div>
                  <span className="v">{v}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <BarChart title={t('admin.byCategory')} data={stats.byCategory} formatter={(k) => t(`cat.${k}`)} />
              <BarChart title={t('admin.byDistrict')} data={stats.byDistrict} />
            </div>
            <div className="grid grid-2" style={{ marginTop: 16 }}>
              <Donut title={t('admin.byStatus')} data={statusData} />
              <BarChart title={t('admin.overTime')} data={stats.overTime} />
            </div>
          </>
        )
      )}

      {tab === 'complaints' && <ComplaintsPanel request={request} />}
      {tab === 'keys' && <KeysPanel />}
    </div>
  );
}
