import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n.jsx';
import { useAuth } from '../auth.jsx';
import { Icon } from '../components/UI.jsx';

function AuthShell({ title, sub, children, alt }) {
  const { t } = useLang();
  return (
    <div className="page container modal-center" style={{ paddingTop: 56, display: 'flex', minHeight: '70vh', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="card" style={{ width: 'min(440px, 100%)', padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <div className="logo" style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--primary-600)', display: 'grid', placeItems: 'center', color: '#fff', margin: '0 auto 14px' }}>
            <Icon name={title.includes('Admin') || t('auth.adminTitle') === title ? 'lock' : 'user'} size={22} />
          </div>
          <h2 style={{ marginBottom: 4 }}>{title}</h2>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>{sub}</p>
        </div>
        {children}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: 14 }}>{alt}</div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to={title === t('auth.adminTitle') ? '/login' : '/admin/login'} style={{ fontSize: 13 }}>
            {title === t('auth.adminTitle') ? t('auth.citizenLink') : t('auth.adminLink')} →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemoHint({ cred }) {
  const { t } = useLang();
  return (
    <div style={{ background: 'var(--amber-50)', border: '1px dashed #f0d9a8', borderRadius: 11, padding: '10px 14px', marginTop: 16, fontSize: 12.5, color: '#92700c' }}>
      <b><Icon name="info" size={12} style={{ verticalAlign: '-2px' }} /> {t('auth.demoHint')}:</b>{' '}
      <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 6 }}>{cred}</code>
    </div>
  );
}

export function LoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(email, password);
      navigate(u.role === 'admin' ? '/admin' : '/dashboard');
    } catch (error) { setErr(error.message); }
    setBusy(false);
  };

  return (
    <AuthShell title={t('auth.loginTitle')} sub={t('auth.loginSub')}
      alt={<span>{t('auth.noAccount')} <Link to="/register">{t('auth.registerTitle').split(' ').slice(0, 3).join(' ')}</Link></span>}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="em">{t('common.email')}</label>
          <input id="em" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">{t('common.password')}</label>
          <input id="pw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? t('common.loading') : t('nav.login')}</button>
      </form>
      <DemoHint cred="demo@citizen.in · Demo@2026" />
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t } = useLang();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      await register(form);
      navigate('/dashboard');
    } catch (error) { setErr(error.message); }
    setBusy(false);
  };

  return (
    <AuthShell title={t('auth.registerTitle')} sub={t('auth.registerSub')}
      alt={<span>{t('auth.haveAccount')} <Link to="/login">{t('nav.login')}</Link></span>}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="nm">{t('common.name')}</label>
          <input id="nm" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required minLength={2} />
        </div>
        <div className="field">
          <label className="label" htmlFor="em">{t('common.email')}</label>
          <input id="em" className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="ph">{t('common.phone')}</label>
          <input id="ph" className="input" inputMode="numeric" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" />
        </div>
        <div className="field">
          <label className="label" htmlFor="pw">{t('common.password')}</label>
          <input id="pw" className="input" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required minLength={6} autoComplete="new-password" />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? t('common.loading') : t('auth.registerTitle')}</button>
      </form>
    </AuthShell>
  );
}

export function AdminLoginPage() {
  const { t } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const u = await login(email, password);
      if (u.role !== 'admin') { setErr('This account does not have admin access.'); return; }
      navigate('/admin');
    } catch (error) { setErr(error.message); }
    setBusy(false);
  };

  return (
    <AuthShell title={t('auth.adminTitle')} sub={t('auth.adminSub')} alt={<Link to="/login">{t('auth.citizenLink')} →</Link>}>
      <form onSubmit={submit}>
        <div className="field">
          <label className="label" htmlFor="aem">{t('common.email')}</label>
          <input id="aem" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="label" htmlFor="apw">{t('common.password')}</label>
          <input id="apw" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {err && <div className="err" style={{ marginBottom: 10 }}><Icon name="alert" size={13} style={{ verticalAlign: '-2px' }} /> {err}</div>}
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? t('common.loading') : t('auth.adminTitle')}</button>
      </form>
      <DemoHint cred="admin@sevamanipur.in · Admin@2026" />
    </AuthShell>
  );
}
