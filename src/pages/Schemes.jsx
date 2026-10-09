import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon, Empty, DemoChip, Spinner, useToast } from '../components/UI.jsx';

const OCCUPATIONS = ['student', 'farmer', 'business', 'salaried', 'unemployed', 'homemaker', 'daily_wage', 'street_vendor', 'senior_citizen'];

export default function Schemes() {
  const { t } = useLang();
  const { user, authMode } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [age, setAge] = useState('');
  const [occupation, setOccupation] = useState('student');
  const [area, setArea] = useState('rural');
  const [income, setIncome] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savedSlugs, setSavedSlugs] = useState(new Set());
  const [catalog, setCatalog] = useState([]);
  const [catalogBusy, setCatalogBusy] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [scope, setScope] = useState('all');
  const [department, setDepartment] = useState('all');
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    api('/api/schemes')
      .then((d) => setCatalog(d.schemes || []))
      .catch(() => setCatalogError('Scheme catalog is temporarily unavailable. Please try again later.'))
      .finally(() => setCatalogBusy(false));
  }, []);

  const departments = useMemo(() => [...new Set(catalog
    .filter((s) => scope === 'all' || (scope === 'manipur' ? s.scope === 'manipur_state' : s.scope !== 'manipur_state'))
    .map((s) => s.dept_name || s.department)
    .filter(Boolean))].sort((a, b) => a.localeCompare(b)), [catalog, scope]);

  const visibleSchemes = useMemo(() => catalog.filter((s) => {
    const scopeMatch = scope === 'all' || (scope === 'manipur' ? s.scope === 'manipur_state' : s.scope !== 'manipur_state');
    const departmentMatch = department === 'all' || (s.dept_name || s.department) === department;
    const term = catalogSearch.trim().toLowerCase();
    const searchMatch = !term || `${s.name} ${s.benefits} ${s.eligibility} ${s.dept_name || s.department}`.toLowerCase().includes(term);
    return scopeMatch && departmentMatch && searchMatch;
  }), [catalog, scope, department, catalogSearch]);

  const find = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api('/api/schemes/match', { method: 'POST', body: { age, occupation, area, income } });
      setResults(d);
      scrollIntoResults();
    } catch { setResults({ results: [], related: [] }); }
    setBusy(false);
  };

  const scrollIntoResults = () => setTimeout(() => document.getElementById('scheme-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

  const toggleSave = async (slug) => {
    if (!user) { navigate('/login'); return; }
    const saved = savedSlugs.has(slug);
    const d = await api(`/api/saves/schemes/${slug}`, { method: saved ? 'DELETE' : 'POST' });
    setSavedSlugs((s) => {
      const n = new Set(s);
      d.saved ? n.add(slug) : n.delete(slug);
      return n;
    });
    toast(d.saved ? t('common.saved') : t('common.save'));
  };

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 980 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">Scheme Finder · {t('common.demo')}</div>
          <h2>{t('schemes.title')}</h2>
          <p>{t('schemes.sub')}</p>
        </div>
      </div>

      <section className="card" style={{ padding: 24, marginBottom: 24 }} aria-labelledby="scheme-catalog-heading">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div className="eyebrow">Scheme directory</div>
            <h3 id="scheme-catalog-heading" style={{ margin: '4px 0' }}>Browse schemes by scope</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Explore Manipur state schemes separately from central and other schemes.</p>
          </div>
          <div className="radio-row" role="tablist" aria-label="Scheme scope">
            {[['all', 'All'], ['manipur', 'Manipur'], ['other', 'Other schemes']].map(([id, label]) => (
              <button type="button" key={id} className={`radio-pill ${scope === id ? 'active' : ''}`}
                onClick={() => { setScope(id); setDepartment('all'); }} role="tab" aria-selected={scope === id}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="scheme-department">Department</label>
            <select id="scheme-department" className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="label" htmlFor="scheme-search">Search schemes</label>
            <input id="scheme-search" className="input" value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} placeholder="Name, department or benefit" />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {catalogBusy ? <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading scheme catalog…</div> : null}
          {catalogError ? <div className="tile-warn" role="alert" style={{ padding: 12, borderRadius: 8 }}>{catalogError}</div> : null}
          {!catalogBusy && !catalogError && visibleSchemes.length === 0 ? <Empty icon="shield" title="No schemes in this section yet." sub="The catalog will grow as more department schemes are verified." /> : null}
          {!catalogBusy && visibleSchemes.length > 0 && (
            <div className="grid grid-2">
              {visibleSchemes.map((s) => (
                <article key={s.slug} className="card" style={{ padding: 18, boxShadow: 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: 15 }}>{s.name}</h4>
                    <span className="badge badge-cyan">{s.scope === 'manipur_state' ? 'Manipur' : 'Other schemes'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 7, margin: '8px 0', flexWrap: 'wrap' }}>
                    <span className="badge">{s.dept_name || s.department}</span>
                    {s.data_status === 'legacy_demo' ? <DemoChip /> : null}
                    {s.application_status === 'check_with_department' ? <span className="badge" title="Current application window is not confirmed">Check with department</span> : null}
                  </div>
                  <p style={{ fontSize: 13, margin: '8px 0', color: 'var(--muted)' }}>{s.eligibility || s.summary}</p>
                  <p style={{ fontSize: 13, margin: '0 0 10px' }}><b>{t('schemes.benefits')}:</b> {s.benefits}</p>
                  {s.official_link || s.source_url ? (
                    <a className="btn btn-outline btn-sm" href={s.official_link || s.source_url} target="_blank" rel="noreferrer">
                      <Icon name="globe" size={13} /> {s.official_link ? t('contacts.website') : 'View source'}
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="eyebrow" style={{ margin: '26px 0 10px' }}>Demo matcher · sample eligibility rules</div>
      <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 12px' }}>The catalog above is source-linked. This prototype matcher uses sample rules and cannot confirm eligibility.</p>

      <form className="card" style={{ padding: 26 }} onSubmit={find}>
        <div className="grid grid-2">
          <div className="field">
            <label className="label" htmlFor="age">{t('schemes.age')}</label>
            <input id="age" className="input" type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g. 19" required />
          </div>
          <div className="field">
            <label className="label" htmlFor="income">{t('schemes.income')}</label>
            <input id="income" className="input" type="number" min="0" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g. 180000" />
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5 }}>{t('schemes.incomeHint')}</div>
          </div>
        </div>

        <div className="field">
          <span className="label">{t('schemes.occupation')}</span>
          <div className="radio-row" role="radiogroup">
            {OCCUPATIONS.map((o) => (
              <button type="button" key={o} className={`radio-pill ${occupation === o ? 'active' : ''}`}
                onClick={() => setOccupation(o)} role="radio" aria-checked={occupation === o}>
                {t(`occ.${o}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">{t('schemes.area')}</span>
          <div className="radio-row" role="radiogroup">
            {['rural', 'urban'].map((a) => (
              <button type="button" key={a} className={`radio-pill ${area === a ? 'active' : ''}`}
                onClick={() => setArea(a)} role="radio" aria-checked={area === a}>
                <Icon name="pin" size={14} /> {a === 'rural' ? 'Rural (লোকতাক / village)' : 'Urban (town)'}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? <Spinner size={17} /> : <Icon name="sparkle" size={18} />} {t('schemes.find')}
        </button>
      </form>

      {results && (
        <div id="scheme-results" style={{ marginTop: 30 }}>
          <h3 style={{ marginBottom: 14 }}>{t('schemes.results')} ({results.results.length})</h3>
          {results.results.length === 0 ? (
            <Empty icon="shield" title={t('schemes.empty')} />
          ) : (
            <div className="grid grid-2">
              {results.results.map((s) => (
                <div key={s.slug} className="card card-hover" style={{ padding: 22 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, fontSize: 16 }}>{s.name}</h4>
                    {authMode !== 'supabase' && <button className="btn btn-ghost btn-sm" onClick={() => toggleSave(s.slug)} aria-label={t('common.save')} style={{ padding: 4 }}>
                      <Icon name="bookmark" size={16} style={{ color: savedSlugs.has(s.slug) ? 'var(--blue-600)' : 'var(--muted)' }} />
                    </button>}
                  </div>
                  <div style={{ display: 'flex', gap: 7, margin: '8px 0 10px', flexWrap: 'wrap' }}>
                    <span className="badge badge-cyan">{s.dept_name || 'Government'}</span>
                    {s.is_demo ? <DemoChip /> : null}
                  </div>

                  <div className="tile-green" style={{ borderRadius: 10, padding: '9px 13px', fontSize: 13.5, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <Icon name="check" size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <b style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t('schemes.why')}</b>
                      <div>{s.matchReasons?.length ? s.matchReasons.join(' · ') : '—'}</div>
                    </div>
                  </div>

                  <p style={{ margin: '12px 0 6px', fontSize: 14 }}><b>{t('schemes.benefits')}:</b> {s.benefits}</p>
                  <p style={{ margin: '0 0 6px', fontSize: 13.5, color: 'var(--muted)' }}><b>{t('schemes.eligibility')}:</b> {s.eligibility}</p>
                  <p style={{ margin: '0 0 14px', fontSize: 13.5, color: 'var(--muted)' }}><b>{t('schemes.documents')}:</b> {s.documents.join(', ')}</p>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {s.official_link && (
                      <a className="btn btn-outline btn-sm" href={s.official_link} target="_blank" rel="noreferrer">
                        <Icon name="globe" size={13} /> {t('contacts.website')}
                      </a>
                    )}
                    <button className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/assistant?q=${encodeURIComponent(`I am ${age || '__'} years old, a ${occupation} living in a ${area} area${income ? ` with family income around ₹${income}` : ''}. Tell me how to apply for the ${s.name} scheme — eligibility, documents and steps.`)}`)}>
                      <Icon name="chat" size={13} /> {t('common.askAI')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {results.related?.length > 0 && (
            <>
              <h3 style={{ margin: '26px 0 12px', color: 'var(--muted)', fontSize: 16 }}>{t('schemes.related')}</h3>
              <div className="grid grid-3">
                {results.related.map((s) => (
                  <div key={s.slug} className="card" style={{ padding: 16 }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: 14.5 }}>{s.name}</h4>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>{s.benefits.slice(0, 100)}…</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
