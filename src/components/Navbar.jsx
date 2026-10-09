import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon } from './UI.jsx';

export function BrandMark({ size = 32 }) {
  return (
    <span className="brand-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      </svg>
    </span>
  );
}

export default function Navbar() {
  const { t, lang, setLang, languages } = useLang();
  const { user, logout, authMode } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    ['/', 'nav.home'],
    ['/services', 'nav.services'],
    ['/schemes', 'nav.schemes'],
    ['/documents', 'nav.documents'],
    ['/report', 'nav.report'],
    ['/track', 'nav.track'],
  ];

  const doLogout = async () => {
    await logout();
    setOpen(false);
    navigate('/');
  };

  return (
    <>
      <div className="topstrip" aria-hidden="true"></div>
      <header className="nav">
        <div className="container nav-inner">
          <Link to="/" className="brand" onClick={() => setOpen(false)} aria-label={t('brand.home')}>
            <BrandMark />
            <span className="brand-name">SevaManipur <span className="brand-ai">AI</span></span>
          </Link>

          <nav className="nav-links" aria-label={t('common.primaryNav')}>
            {links.map(([to, key]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {t(key)}
              </NavLink>
            ))}
          </nav>

          <div className="nav-right">
            <select
              className="select nav-desktop-only" style={{ width: 'auto', padding: '6px 9px', fontSize: 13.5 }}
              value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('common.language')}
            >
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>

            <Link to="/assistant" className="btn btn-assist btn-sm nav-desktop-only">
              <Icon name="chat" size={14} /> {t('common.askAI')}
            </Link>

            {user ? (
              <>
                {authMode !== 'supabase' && <Link to="/dashboard" className="btn btn-outline btn-sm nav-desktop-only">
                  <Icon name="user" size={14} /> {t('nav.dashboard')}
                </Link>}
                {authMode !== 'supabase' && user.role === 'admin' && (
                  <Link to="/admin" className="btn btn-primary btn-sm nav-desktop-only">
                    <Icon name="settings" size={14} /> {t('nav.admin')}
                  </Link>
                )}
                <button className="btn btn-ghost btn-sm nav-desktop-only" onClick={doLogout}>
                  <Icon name="logout" size={14} /> {t('nav.logout')}
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                <Icon name="lock" size={14} /> {t('nav.login')}
              </Link>
            )}

            <button className="hamburger" onClick={() => setOpen(!open)} aria-label={t('common.menu')} aria-expanded={open}>
              <Icon name={open ? 'x' : 'menu'} size={19} />
            </button>
          </div>
        </div>

        <div className={`mobile-menu ${open ? 'open' : ''}`}>
          <NavLink to="/assistant" onClick={() => setOpen(false)}>
            💬 {t('common.askAI')}
          </NavLink>
          {links.map(([to, key]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}>
              {t(key)}
            </NavLink>
          ))}
          <NavLink to="/contacts" onClick={() => setOpen(false)}>{t('nav.contacts')}</NavLink>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 'auto' }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('common.language')}>
              {languages.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
            {user ? (
              <>
                {authMode !== 'supabase' && <Link to="/dashboard" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>{t('nav.dashboard')}</Link>}
                {authMode !== 'supabase' && user.role === 'admin' && <Link to="/admin" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>{t('nav.admin')}</Link>}
                <button className="btn btn-ghost btn-sm" onClick={doLogout}>{t('nav.logout')}</button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
