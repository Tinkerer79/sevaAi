import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useLang } from '../i18n.jsx';
import { Icon, Empty, DemoChip } from '../components/UI.jsx';

export default function Contacts() {
  const { t } = useLang();
  const [contacts, setContacts] = useState(null);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('All');

  useEffect(() => {
    const timer = setTimeout(() => {
      const p = new URLSearchParams();
      if (search.trim()) p.set('search', search.trim());
      if (district !== 'All') p.set('district', district);
      setContacts(null);
      api(`/api/contacts?${p}`).then((d) => setContacts(d.contacts)).catch(() => setContacts([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, district]);

  const districts = ['All', ...new Set((contacts || []).map((c) => c.district))];

  return (
    <div className="page container" style={{ paddingTop: 34, maxWidth: 940 }}>
      <div className="section-head">
        <div>
          <div className="eyebrow">{t('contacts.directory')} · {t('common.demo')}</div>
          <h2>{t('contacts.title')}</h2>
          <p>{t('contacts.sub')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Icon name="search" size={17} style={{ position: 'absolute', left: 13, top: 13, color: '#8aa0bd' }} />
          <input className="input" style={{ paddingLeft: 40 }} placeholder={t('common.search') + '…'} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto', minWidth: 160 }} value={district} onChange={(e) => setDistrict(e.target.value)}>
          {districts.map((d) => <option key={d} value={d}>{d === 'All' ? t('contacts.allDistricts') : d}</option>)}
        </select>
      </div>

      {!contacts ? (
        <div className="grid grid-2">{[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 130 }} />)}</div>
      ) : contacts.length === 0 ? (
        <Empty title={t('contacts.empty')} />
      ) : (
        <div className="grid grid-2">
          {contacts.map((c) => (
            <div key={c.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15.5 }}>{c.department}</h3>
                  <p style={{ margin: '3px 0 0', fontSize: 13.5, color: 'var(--muted)' }}>{c.service}</p>
                </div>
                <span className="badge badge-cyan" style={{ flexShrink: 0 }}>{c.district}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, fontSize: 13.5, color: 'var(--muted)', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="phone" size={14} /> {c.phone}</span>
                {c.email && <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="mail" size={14} /> {c.email}</span>}
              </div>
              <p style={{ margin: '7px 0 12px', fontSize: 13.5, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Icon name="building" size={14} /> {c.office}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <a className="btn btn-primary btn-sm" href={`tel:${c.phone.replace(/\s/g, '')}`}><Icon name="phone" size={13} /> {t('contacts.call')}</a>
                {c.email && <a className="btn btn-outline btn-sm" href={`mailto:${c.email}`}><Icon name="mail" size={13} /> {t('contacts.email')}</a>}
                {c.website && <a className="btn btn-outline btn-sm" href={c.website} target="_blank" rel="noreferrer"><Icon name="globe" size={13} /> {t('contacts.website')}</a>}
                {c.is_demo ? <DemoChip /> : <span className="badge badge-green"><Icon name="check" size={11} /> {t('contacts.nationalHelpline')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
