import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon, Empty, DemoChip, Spinner, useToast } from '../components/UI.jsx';

const CATEGORY_ICONS = {
  Certificates: 'file', Education: 'layers', Health: 'shield', Agriculture: 'grid',
  Transport: 'map', Employment: 'trend', Business: 'building', 'Social Welfare': 'user',
  'Land & Revenue': 'pin', 'Civic Services': 'settings',
};

export function ServicesPage() {
  const { t } = useLang();
  const [services, setServices] = useState(null);
  const [categories, setCategories] = useState(['All']);
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const category = params.get('category') || 'All';
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => { setSearchInput(params.get('search') || ''); }, [params]);

  useEffect(() => {
    api('/api/services/categories').then((d) => setCategories(['All', ...d.categories])).catch(() => {});
  }, []);

  // Debounced: typing updates the URL, URL drives the fetch (deep-linkable)
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams();
      if (searchInput.trim()) next.set('search', searchInput.trim());
      if (category !== 'All') next.set('category', category);
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    setServices(null);
    const p = new URLSearchParams();
    if (search.trim()) p.set('search', search.trim());
    if (category !== 'All') p.set('category', category);
    api(`/api/services?${p}`).then((d) => setServices(d.services)).catch(() => setServices([]));
  }, [search, category]);

  return (
    <div className="page container" style={{ paddingTop: 34 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{t('common.demo')}</div>
          <h2>{t('services.title')}</h2>
          <p>{t('services.sub')}</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Icon name="search" size={17} style={{ position: 'absolute', left: 13, top: 12, color: 'var(--faint)' }} />
        <input className="input" style={{ paddingLeft: 40 }} placeholder={t('services.searchPh')}
          value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          aria-label={t('common.search')} />
      </div>

      <div className="cat-row" role="group" aria-label={t('common.category')}>
        {categories.map((c) => (
          <button key={c} className={`cat-chip ${category === c ? 'active' : ''}`}
            onClick={() => {
              const next = new URLSearchParams(params);
              c === 'All' ? next.delete('category') : next.set('category', c);
              setParams(next);
            }}>
            {c}
          </button>
        ))}
      </div>

      {!services ? (
        <div className="grid grid-3">{[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 158 }} />)}</div>
      ) : services.length === 0 ? (
        <Empty title={t('services.empty')} />
      ) : (
        <div className="grid grid-3">
          {services.map((s) => (
            <article key={s.slug} className="card card-hover pop-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div className={`icon-tile tile-blue`} style={{ width: 36, height: 36, borderRadius: 8 }}>
                  <Icon name={CATEGORY_ICONS[s.category] || 'file'} size={17} />
                </div>
                <div className="dept" style={{ flex: 1 }}>{s.dept_name || s.category}</div>
                {s.is_demo ? <DemoChip /> : null}
              </div>
              <h3>{s.name}</h3>
              <p className="desc">{s.description.length > 128 ? s.description.slice(0, 128) + '…' : s.description}</p>
              <div className="foot">
                <Link to={`/services/${s.slug}`} className="btn btn-outline btn-sm">
                  {t('pop.viewService')} <Icon name="chevron" size={13} />
                </Link>
                <Link to={`/assistant?q=${encodeURIComponent(`Explain ${s.name}: eligibility, documents and how to apply.`)}`}
                  className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                  <Icon name="chat" size={13} /> {t('nav.assistant')}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ServiceDetailPage() {
  const { slug } = useParams();
  const { t } = useLang();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setService(null); setError(null);
    api(`/api/services/${slug}`)
      .then((d) => setService(d.service))
      .catch((e) => setError(e.message));
  }, [slug]);

  useEffect(() => {
    if (user && slug) api(`/api/saves/services/status/${slug}`).then((d) => setSaved(d.saved)).catch(() => {});
  }, [user, slug]);

  const toggleSave = async () => {
    if (!user) { navigate('/login'); return; }
    const d = await api(`/api/saves/services/${slug}`, { method: saved ? 'DELETE' : 'POST' });
    setSaved(d.saved);
    toast(d.saved ? t('common.saved') : t('common.save'));
  };

  if (error) return <div className="page container"><Empty icon="alert" title={error} sub={<Link to="/services">{t('services.title')}</Link>} /></div>;
  if (!service) return <div className="page container"><div className="skeleton" style={{ height: 300 }} /></div>;

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 900 }}>
      <Link to="/services" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, marginBottom: 16 }}>
        <Icon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }} /> {t('services.title')}
      </Link>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <span className="badge badge-blue">{service.category}</span>
              {service.is_demo ? <DemoChip /> : null}
            </div>
            <h2 style={{ marginBottom: 6 }}>{service.name}</h2>
            <p style={{ color: 'var(--muted)', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Icon name="building" size={15} /> {service.dept_name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={toggleSave}>
              <Icon name="bookmark" size={14} /> {saved ? t('common.saved') : t('common.save')}
            </button>
            <button className="btn btn-primary btn-sm"
              onClick={() => navigate(`/assistant?q=${encodeURIComponent(`Explain how to apply for: ${service.name}. What documents do I need and where do I apply?`)}`)}>
              <Icon name="chat" size={14} /> {t('common.askAI')}
            </button>
          </div>
        </div>
        <p style={{ marginTop: 14 }}>{service.description}</p>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="user" size={17} style={{ color: 'var(--primary-600)' }} /> {t('services.eligibility')}</h3>
          <p style={{ color: 'var(--muted)', margin: 0 }}>{service.eligibility}</p>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="file" size={17} style={{ color: 'var(--navy-700)' }} /> {t('services.docs')}</h3>
          <ul className="checklist" style={{ marginTop: 10 }}>
            {service.documents.map((d, i) => (
              <li key={i} style={{ padding: '9px 12px' }}>
                <span className="check"><Icon name="check" size={13} /></span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{d.item || d}</div>
                  {d.note && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{d.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card" style={{ padding: 22, marginTop: 16 }}>
        <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="layers" size={17} style={{ color: 'var(--teal-600)' }} /> {t('services.steps')}</h3>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {service.steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="step-num" style={{ width: 28, height: 28, fontSize: 13, flexShrink: 0, background: 'var(--primary-600)', borderRadius: 8, boxShadow: 'none' }}>{i + 1}</span>
              <p style={{ margin: '3px 0 0', fontSize: 14.5 }}>{s}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {service.official_link ? (
            <a className="btn btn-outline btn-sm" href={service.official_link} target="_blank" rel="noreferrer">
              <Icon name="globe" size={14} /> {t('services.link')}
            </a>
          ) : (
            <span className="badge badge-grey"><Icon name="info" size={12} /> Apply at the department office (no online portal listed)</span>
          )}
          <Link to="/documents" className="btn btn-outline btn-sm"><Icon name="file" size={14} /> {t('nav.documents')}</Link>
        </div>
      </div>
    </div>
  );
}
