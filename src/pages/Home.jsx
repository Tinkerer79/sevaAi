import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { Icon } from '../components/UI.jsx';

const POPULAR_SLUGS = [
  'income-certificate', 'birth-certificate', 'post-matric-scholarship-st',
  'cmht-health-cover', 'driving-licence', 'old-age-pension', 'ration-card', 'pm-kisan',
];

const QUICK = [
  ['file', 'tile-blue', '/services?category=Certificates', 'qs.c1', 'qs.c1d'],
  ['layers', 'tile-cyan', '/services?category=Education', 'qs.c2', 'qs.c2d'],
  ['shield', 'tile-green', '/schemes', 'qs.c3', 'qs.c3d'],
  ['trend', 'tile-amber', '/services?category=Employment', 'qs.c4', 'qs.c4d'],
  ['check', 'tile-violet', '/documents', 'qs.c5', 'qs.c5d'],
  ['user', 'tile-red', '/services?category=Social%20Welfare', 'qs.c6', 'qs.c6d'],
];

const WHY = [
  ['trust.p1', 'trust.p1d'],
  ['trust.p2', 'trust.p2d'],
  ['trust.p3', 'trust.p3d'],
  ['trust.p4', 'trust.p4d'],
  ['trust.p5', 'trust.p5d'],
];

const HOW = [
  ['how.s1', 'how.s1d'],
  ['how.s2', 'how.s2d'],
  ['how.s3', 'how.s3d'],
  ['how.s4', 'how.s4d'],
];

export default function Home() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [ask, setAsk] = useState('');
  const [popular, setPopular] = useState([]);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    api('/api/services').then((d) => {
      const map = new Map(d.services.map((s) => [s.slug, s]));
      setPopular(POPULAR_SLUGS.map((s) => map.get(s)).filter(Boolean));
      setCounts((c) => ({ ...c, services: d.services.length }));
    }).catch(() => {});
    api('/api/schemes').then((d) => setCounts((c) => ({ ...c, schemes: d.schemes.length }))).catch(() => {});
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/services${ask.trim() ? `?search=${encodeURIComponent(ask.trim())}` : ''}`);
  };

  const onAskAI = () => {
    navigate(`/assistant${ask.trim() ? `?q=${encodeURIComponent(ask.trim())}` : ''}`);
  };

  const panel = popular.slice(0, 5);
  const featured = popular[0];
  const rest = popular.slice(1, 6);

  return (
    <div className="page">
      {/* ── Hero: copy + search left, frequently-accessed panel right ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow">{t('home.eyebrow')}</div>
              <h1>Government services, <span className="accent">made easier.</span></h1>
              <p className="hero-tag">Seva Manipur — {t('home.tagline')}</p>
              <p className="sub">{t('home.heroSub')}</p>

              <form className="hero-search" onSubmit={onSearch} role="search">
                <Icon name="search" size={18} style={{ alignSelf: 'center', marginLeft: 8, color: 'var(--faint)' }} />
                <input
                  value={ask} onChange={(e) => setAsk(e.target.value)}
                  placeholder={t('home.searchPh')} aria-label={t('home.searchPh')}
                />
                <button className="btn btn-primary" type="submit">
                  <Icon name="search" size={15} /> {t('home.searchBtn')}
                </button>
                <button className="btn btn-assist" type="button" onClick={onAskAI}>
                  <Icon name="chat" size={15} /> {t('common.askAI')}
                </button>
              </form>

              <p className="hero-note">
                <Icon name="info" size={14} />
                <span>{t('home.prototypeNote')}</span>
              </p>
            </div>

            <aside className="hero-panel" aria-label={t('home.panel')}>
              <h2 className="panel-title">{t('home.panel')}</h2>
              <ol className="panel-list">
                {panel.length === 0
                  ? [0, 1, 2, 3, 4].map((i) => (
                      <li key={i}><div className="skeleton" style={{ height: 34, margin: '10px 17px' }} /></li>
                    ))
                  : panel.map((s, i) => (
                      <li key={s.slug}>
                        <Link to={`/services/${s.slug}`}>
                          <span className="idx" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                          <span><b>{s.name}</b><small>{s.dept_name || s.category}</small></span>
                          <Icon name="chevron" size={15} className="chev" />
                        </Link>
                      </li>
                    ))}
              </ol>
              <Link to="/services" className="panel-more">
                <span>{t('home.panelMore')}{counts?.services ? ` · ${counts.services}` : ''}</span>
                <Icon name="arrow" size={14} />
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Quick services: single divided directory strip ── */}
      <section className="section container" style={{ paddingTop: 38 }}>
        <div className="section-head">
          <div>
            <h2>{t('qs.title')}</h2>
            <p>{t('qs.sub')}</p>
          </div>
        </div>
        <div className="dir-grid">
          {QUICK.map(([icon, tile, href, title, sub]) => (
            <Link key={href} to={href} className="dir-cell">
              <div className={`icon-tile ${tile}`}><Icon name={icon} size={19} /></div>
              <div>
                <h3>{t(title)}</h3>
                <p>{t(sub)}</p>
              </div>
              <Icon name="chevron" size={15} className="go" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── Popular services: featured card + regular grid ── */}
      {popular.length > 0 && (
        <section className="section container">
          <div className="section-head">
            <div>
              <h2>{t('pop.title')}</h2>
              <p>{t('pop.sub')}</p>
            </div>
            <Link className="section-link" to="/services">{t('pop.viewAll')} <Icon name="arrow" size={15} /></Link>
          </div>
          <div className="pop-grid">
            {featured && (
              <article className="card card-hover pop-card featured">
                <div className="dept">{featured.dept_name || featured.category}</div>
                <h3>{featured.name}</h3>
                <p className="desc">{featured.description}</p>
                <p className="ely"><b>{t('services.eligibility')}</b> — {featured.eligibility}</p>
                <div className="foot">
                  <Link to={`/services/${featured.slug}`} className="btn btn-outline btn-sm">
                    {t('pop.viewService')} <Icon name="chevron" size={13} />
                  </Link>
                  <Link to={`/assistant?q=${encodeURIComponent(`Explain ${featured.name}: eligibility, documents and how to apply.`)}`}
                    className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
                    <Icon name="chat" size={13} /> {t('nav.assistant')}
                  </Link>
                </div>
              </article>
            )}
            {rest.map((s) => (
              <article key={s.slug} className="card card-hover pop-card">
                <div className="dept">{s.dept_name || s.category}</div>
                <h3>{s.name}</h3>
                <p className="desc">{s.description.length > 110 ? s.description.slice(0, 110) + '…' : s.description}</p>
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
        </section>
      )}

      {/* ── Why: editorial two-column with numbered list ── */}
      <section className="section container">
        <div className="why-grid">
          <div className="why-copy">
            <h2>{t('trust.title')}</h2>
            <p>{t('why.lead')}</p>
            <Link className="section-link" to="/about">{t('why.more')} <Icon name="arrow" size={14} /></Link>
          </div>
          <ol className="why-numbers">
            {WHY.map(([title, desc], i) => (
              <li key={title}>
                <span className="num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{t(title)}</h3>
                  <p>{t(desc)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Closing pair: how-it-works panel + AI callout ── */}
      <section className="section container" style={{ paddingBottom: 8 }}>
        <div className="close-grid">
          <aside className="how-card">
            <h3>{t('how.title')}</h3>
            <p className="sub">{t('how.sub')}</p>
            <ol>
              {HOW.map(([title, desc], i) => (
                <li key={title}>
                  <span className="n">{i + 1}</span>
                  <div><b>{t(title)}</b><span>{t(desc)}</span></div>
                </li>
              ))}
            </ol>
            <p className="meta">
              {counts?.services ? t('trust.counts', { services: counts.services, schemes: counts.schemes ?? '…' }) : ''}
            </p>
          </aside>

          <div className="ai-band">
            <div>
              <h3>{t('ai.title')}</h3>
              <p>{t('ai.sub')}</p>
            </div>
            <div className="actions">
              <Link to="/assistant" className="btn btn-primary">
                <Icon name="chat" size={15} /> {t('common.askAI')}
              </Link>
              <span className="note">{t('ai.note')}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <p style={{ textAlign: 'center', color: 'var(--faint)', fontSize: 12.5, margin: '26px 0 0' }}>{t('home.reviewed')}</p>
      </div>
    </div>
  );
}
