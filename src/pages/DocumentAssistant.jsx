import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { Icon, Empty, DemoChip } from '../components/UI.jsx';
import AiInfoModal from '../components/AiInfoModal.jsx';

const CATEGORY_TRANSLATION_KEYS = {
  Certificates: 'category.certificates', Education: 'category.education', Health: 'category.health',
  Agriculture: 'category.agriculture', Transport: 'category.transport', Employment: 'category.employment',
  Business: 'category.business', 'Social Welfare': 'category.socialWelfare',
  'Land & Revenue': 'category.landRevenue', 'Civic Services': 'category.civicServices',
};

export default function DocumentAssistant() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [slug, setSlug] = useState('');
  const [service, setService] = useState(null);
  const [checked, setChecked] = useState({});
  const [showAiGuide, setShowAiGuide] = useState(false);

  useEffect(() => {
    api('/api/services').then((d) => {
      setServices(d.services);
      if (d.services.length) setSlug(d.services[0].slug);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    setService(null);
    api(`/api/services/${slug}`).then((d) => { setService(d.service); setChecked({}); setShowAiGuide(false); }).catch(() => {});
  }, [slug]);

  const missing = service ? service.documents.filter((_, i) => !checked[i]).map((d) => (d.item || d)) : [];

  const askMissing = () => {
    if (!service) return;
    const q = `I want to apply for a ${service.name}. I have these documents ready: ${service.documents.filter((_, i) => checked[i]).map((d) => (d.item || d)).join(', ') || 'none yet'}. ` +
      `Documents I still need: ${missing.join(', ') || 'none'}. Explain in simple language what each document is, how to get the missing ones, and what happens at the office.`;
    navigate(`/assistant?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 1020 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{t('docs.eyebrow')} · {t('common.demo')}</div>
          <h2>{t('docs.title')}</h2>
          <p>{t('docs.sub')}</p>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <div className="card" style={{ padding: 18 }}>
          <label className="label" htmlFor="svc">{t('docs.pick')}</label>
          <select id="svc" className="select" value={slug} onChange={(e) => setSlug(e.target.value)} style={{ marginBottom: 14 }}>
            {services.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
          </select>
          <div style={{ display: 'grid', gap: 5, maxHeight: 420, overflowY: 'auto' }}>
            {services.map((s) => (
              <button key={s.slug} onClick={() => setSlug(s.slug)}
                style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: slug === s.slug ? 'var(--blue-50)' : '#fff', cursor: 'pointer', fontSize: 13.5, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <span>{s.name}</span>
                <span className="badge badge-grey" style={{ fontSize: 11 }}>{t(CATEGORY_TRANSLATION_KEYS[s.category] || s.category)}</span>
              </button>
            ))}
          </div>
        </div>

        {!service ? (
          <div className="skeleton" style={{ height: 420 }} />
        ) : (
          <div>
            <div className="card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 17 }}>{service.name}</h3>
                {service.is_demo ? <DemoChip /> : null}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 16px' }}>{service.dept_name}</p>

              <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 10 }}>
                {t('docs.required')} ({Object.values(checked).filter(Boolean).length}/{service.documents.length})
              </h4>
              <ul className="checklist">
                {service.documents.map((d, i) => (
                  <li key={i} style={{ cursor: 'pointer', borderColor: checked[i] ? 'var(--green-600)' : undefined, background: checked[i] ? 'var(--green-50)' : undefined }}
                    onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))} role="checkbox" aria-checked={!!checked[i]}>
                    <span className="check" style={{ background: checked[i] ? 'var(--green-600)' : undefined, color: checked[i] ? '#fff' : undefined }}>
                      <Icon name={checked[i] ? 'check' : 'file'} size={13} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, textDecoration: checked[i] ? 'line-through' : 'none', opacity: checked[i] ? 0.75 : 1 }}>{d.item || d}</div>
                      {d.note && <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{d.note}</div>}
                    </div>
                  </li>
                ))}
              </ul>

              {service.official_link ? (
                <a className="btn btn-outline" style={{ marginTop: 16, width: '100%' }} href={service.official_link} target="_blank" rel="noreferrer">
                  <Icon name="globe" size={16} /> {t('services.link')}
                </a>
              ) : null}
              <button className="btn btn-outline" style={{ marginTop: 16, width: '100%' }} onClick={() => setShowAiGuide(true)}>
                <Icon name="sparkle" size={16} /> {t('docs.aiGuide')}
              </button>
              <button className="btn btn-primary" style={{ marginTop: 9, width: '100%' }} onClick={askMissing}>
                <Icon name="chat" size={16} /> {t('docs.missing')}
              </button>
            </div>

            <div className="card" style={{ padding: 22, marginTop: 16 }}>
              <h4 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 14 }}>{t('docs.steps')}</h4>
              <div className="timeline">
                {service.steps.map((s, i) => (
                  <div key={i} className="tl-item done" style={{ paddingBottom: 14 }}>
                    <span className="tl-dot" style={{ width: 26, height: 26, left: -32, fontWeight: 700, fontSize: 12, background: 'var(--blue-600)', color: '#fff', border: 'none' }}>{i + 1}</span>
                    <div style={{ fontSize: 14 }}>{s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {showAiGuide && service ? (
        <AiInfoModal type="service" slug={service.slug} title={service.name}
          sourceUrl={service.official_link} onClose={() => setShowAiGuide(false)}>
          <p>{service.description}</p>
          <p><b>{t('docs.required')}:</b> {service.documents.map((doc, i) => `${checked[i] ? '✓' : '•'} ${doc.item || doc}`).join(' · ')}</p>
          {service.steps?.length ? <p><b>{t('docs.steps')}:</b> {service.steps.join(' ')}</p> : null}
          <div className="badge">{service.dept_name || service.category}</div>
          {service.is_demo ? <DemoChip /> : null}
        </AiInfoModal>
      ) : null}
    </div>
  );
}
